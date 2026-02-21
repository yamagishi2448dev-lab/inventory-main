/**
 * 商品画像アップロードスクリプト
 *
 * 使い方:
 *   npx tsx scripts/upload-product-images.ts           # ドライラン（実際にはアップロードしない）
 *   npx tsx scripts/upload-product-images.ts --execute  # 本番実行
 *
 * 前提:
 *   - scripts/product-image-match.ts を先に実行してマッチングCSVを生成済み
 *   - 商品画像/ フォルダに画像ファイルが配置済み
 *   - Cloudinary環境変数（CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET）が設定済み
 *
 * 動作:
 *   1. マッチング結果CSV（商品画像/マッチング結果.csv）を読み込み
 *   2. 「確定」「要確認」のエントリについて、最高スコア候補にアップロード
 *   3. 既存画像がある商品はスキップ
 *   4. _001/_002 サフィックス付きファイルは同一商品の追加画像として order を割り当て
 *   5. 結果をコンソールとCSVレポートに出力
 */

import { PrismaClient } from '@prisma/client'
import { v2 as cloudinary } from 'cloudinary'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

// Cloudinary設定
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
}

// ========================================
// マッチング結果CSVの読み込み
// ========================================

interface MatchEntry {
  status: string     // '確定' | '要確認' | '未マッチ'
  folder: string
  baseName: string
  fileCount: number
  matchSku: string
  matchName: string
  matchType: string
  score: number
  strategy: string
  existingImageCount: number
}

function parseMatchingCsv(csvPath: string): MatchEntry[] {
  const content = fs.readFileSync(csvPath, 'utf-8')
  // BOM除去
  const clean = content.replace(/^\ufeff/, '')
  const lines = clean.split('\n').filter((l) => l.trim())

  // ヘッダースキップ
  const entries: MatchEntry[] = []
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVRow(lines[i])
    if (row.length < 10) continue

    const status = row[0]
    if (status === '未マッチ') continue // 未マッチはスキップ

    entries.push({
      status,
      folder: row[1],
      baseName: row[2],
      fileCount: parseInt(row[3]) || 0,
      matchSku: row[4],
      matchName: row[5],
      matchType: row[6],
      score: parseInt(row[7]) || 0,
      strategy: row[8],
      existingImageCount: parseInt(row[9]) || 0,
    })
  }

  return entries
}

/** CSVの1行をパース（ダブルクォート対応） */
function parseCSVRow(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current)
  return result
}

// ========================================
// ファイル一覧CSVから実際のファイルパスを取得
// ========================================

interface ImageFile {
  folder: string
  filename: string
  baseName: string
  order: number // _NNN サフィックスから抽出した順番
}

function loadFileList(csvPath: string): ImageFile[] {
  const content = fs.readFileSync(csvPath, 'utf-8')
  const clean = content.replace(/^\ufeff/, '')
  const lines = clean.split('\n').filter((l) => l.trim())

  const files: ImageFile[] = []
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map((s) => s.trim())
    if (parts.length < 2) continue

    const folder = parts[0]
    const filename = parts[1]
    const baseName = extractBaseName(filename)

    // _NNN サフィックスからorder決定
    const suffixMatch = filename.replace(/\.[^.]+$/, '').match(/_(\d{3})$/)
    const order = suffixMatch ? parseInt(suffixMatch[1]) - 1 : 0 // _001→0, _002→1

    files.push({ folder, filename, baseName, order })
  }

  return files
}

function extractBaseName(filename: string): string {
  let base = filename.replace(/\.[^.]+$/, '')
  base = base.replace(/_\d{3}$/, '')
  return base
}

// ========================================
// Cloudinaryアップロード
// ========================================

async function uploadFileToCloudinary(
  filePath: string,
  itemSku: string,
  order: number
): Promise<string> {
  const buffer = fs.readFileSync(filePath)
  const ext = path.extname(filePath)
  const randomStr = crypto.randomBytes(8).toString('hex')
  const publicId = `${itemSku}_${order}_${randomStr}`

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: 'inventory',
          public_id: publicId,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            reject(new Error(`Cloudinaryアップロードエラー: ${error.message}`))
          } else if (result) {
            resolve(result.secure_url)
          } else {
            reject(new Error('アップロード結果が取得できませんでした'))
          }
        }
      )
      .end(buffer)
  })
}

// ========================================
// メイン処理
// ========================================

interface UploadResult {
  baseName: string
  folder: string
  sku: string
  itemName: string
  status: 'uploaded' | 'skipped_existing' | 'skipped_no_file' | 'skipped_dup_sku' | 'error'
  imageCount: number
  error?: string
}

async function main() {
  const isExecute = process.argv.includes('--execute')
  const mode = isExecute ? '本番実行' : 'ドライラン'

  console.log('========================================')
  console.log(`商品画像アップロード [${mode}]`)
  console.log('========================================\n')

  // Cloudinary設定チェック
  if (isExecute && !isCloudinaryConfigured()) {
    console.error('エラー: Cloudinary環境変数が設定されていません')
    console.error('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET を設定してください')
    process.exit(1)
  }

  const baseDir = path.join(process.cwd(), '商品画像')

  // マッチング結果CSV読み込み
  const matchCsvPath = path.join(baseDir, 'マッチング結果.csv')
  if (!fs.existsSync(matchCsvPath)) {
    console.error('エラー: マッチング結果.csv が見つかりません')
    console.error('先に scripts/product-image-match.ts を実行してください')
    process.exit(1)
  }

  const matchEntries = parseMatchingCsv(matchCsvPath)
  console.log(`マッチング結果: ${matchEntries.length}件（確定+要確認）\n`)

  // ファイル一覧CSV読み込み
  const fileListPath = path.join(baseDir, 'ファイル一覧.csv')
  const allFiles = loadFileList(fileListPath)
  console.log(`画像ファイル一覧: ${allFiles.length}件\n`)

  // DBから現在の画像数を再取得（最新状態）
  const dbItems = await prisma.item.findMany({
    select: {
      id: true,
      sku: true,
      name: true,
      _count: { select: { images: true } },
    },
  })
  const itemBySku = new Map(dbItems.map((item) => [item.sku, item]))

  // 同一SKUに複数の画像グループがマッチする場合、最高スコアのみ採用
  // まずスコア降順にソートし、処理済みSKUを追跡
  const sortedEntries = [...matchEntries].sort((a, b) => b.score - a.score)
  const processedSkus = new Set<string>()

  // アップロード処理
  const results: UploadResult[] = []
  let uploadedCount = 0
  let skippedExisting = 0
  let skippedNoFile = 0
  let skippedDupSku = 0
  let errorCount = 0

  for (const entry of sortedEntries) {
    const item = itemBySku.get(entry.matchSku)
    if (!item) {
      results.push({
        baseName: entry.baseName,
        folder: entry.folder,
        sku: entry.matchSku,
        itemName: entry.matchName,
        status: 'error',
        imageCount: 0,
        error: 'DBにSKUが見つからない',
      })
      errorCount++
      continue
    }

    // 既存画像がある場合はスキップ
    if (item._count.images > 0) {
      results.push({
        baseName: entry.baseName,
        folder: entry.folder,
        sku: entry.matchSku,
        itemName: entry.matchName,
        status: 'skipped_existing',
        imageCount: item._count.images,
      })
      skippedExisting++
      console.log(`[スキップ] ${entry.matchSku} "${entry.matchName}" - 既存画像${item._count.images}枚あり`)
      continue
    }

    // 同一SKUが既に処理済みの場合はスキップ
    if (processedSkus.has(entry.matchSku)) {
      results.push({
        baseName: entry.baseName,
        folder: entry.folder,
        sku: entry.matchSku,
        itemName: entry.matchName,
        status: 'skipped_dup_sku',
        imageCount: 0,
        error: `同一SKUの別画像グループ（より高スコアのマッチを採用済み）`,
      })
      skippedDupSku++
      console.log(`[重複SKUスキップ] ${entry.matchSku} ← "${entry.baseName}" (score:${entry.score})`)
      continue
    }

    // このベース名に対応する実際のファイルを探す
    const matchingFiles = allFiles
      .filter((f) => f.folder === entry.folder && f.baseName === entry.baseName)
      .sort((a, b) => a.order - b.order)

    if (matchingFiles.length === 0) {
      results.push({
        baseName: entry.baseName,
        folder: entry.folder,
        sku: entry.matchSku,
        itemName: entry.matchName,
        status: 'skipped_no_file',
        imageCount: 0,
        error: 'ファイル一覧にはあるが実ファイルが見つからない',
      })
      skippedNoFile++
      continue
    }

    // 実ファイルの存在確認
    const existingFiles = matchingFiles.filter((f) => {
      const filePath = path.join(baseDir, f.folder, f.filename)
      return fs.existsSync(filePath)
    })

    if (existingFiles.length === 0) {
      results.push({
        baseName: entry.baseName,
        folder: entry.folder,
        sku: entry.matchSku,
        itemName: entry.matchName,
        status: 'skipped_no_file',
        imageCount: 0,
        error: 'ファイルが実在しない',
      })
      skippedNoFile++
      console.log(`[ファイルなし] "${entry.baseName}" (${entry.folder}) - 実ファイルなし`)
      continue
    }

    // アップロード実行
    if (isExecute) {
      try {
        const uploadedUrls: string[] = []

        for (const file of existingFiles) {
          const filePath = path.join(baseDir, file.folder, file.filename)
          const url = await uploadFileToCloudinary(filePath, entry.matchSku, file.order)
          uploadedUrls.push(url)
        }

        // DB に ItemImage レコードを作成
        await prisma.itemImage.createMany({
          data: uploadedUrls.map((url, idx) => ({
            itemId: item.id,
            url,
            order: idx,
          })),
        })

        results.push({
          baseName: entry.baseName,
          folder: entry.folder,
          sku: entry.matchSku,
          itemName: entry.matchName,
          status: 'uploaded',
          imageCount: uploadedUrls.length,
        })
        processedSkus.add(entry.matchSku)
        uploadedCount++
        console.log(
          `[アップロード] ${entry.matchSku} "${entry.matchName}" - ${uploadedUrls.length}枚`
        )
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        results.push({
          baseName: entry.baseName,
          folder: entry.folder,
          sku: entry.matchSku,
          itemName: entry.matchName,
          status: 'error',
          imageCount: 0,
          error: errorMsg,
        })
        errorCount++
        console.error(`[エラー] ${entry.matchSku} "${entry.matchName}": ${errorMsg}`)
      }
    } else {
      // ドライラン
      results.push({
        baseName: entry.baseName,
        folder: entry.folder,
        sku: entry.matchSku,
        itemName: entry.matchName,
        status: 'uploaded',
        imageCount: existingFiles.length,
      })
      processedSkus.add(entry.matchSku)
      uploadedCount++
      console.log(
        `[ドライラン] ${entry.matchSku} "${entry.matchName}" ← ${existingFiles.map((f) => f.filename).join(', ')}`
      )
    }
  }

  // サマリー
  console.log('\n========================================')
  console.log(`アップロード結果サマリー [${mode}]`)
  console.log('========================================')
  console.log(`アップロード${isExecute ? '済' : '予定'}: ${uploadedCount}件`)
  console.log(`スキップ（既存画像あり）: ${skippedExisting}件`)
  console.log(`スキップ（ファイルなし）: ${skippedNoFile}件`)
  console.log(`スキップ（重複SKU）: ${skippedDupSku}件`)
  console.log(`エラー: ${errorCount}件`)
  console.log(`合計: ${results.length}件`)

  // 結果CSVレポート出力
  const reportPath = path.join(baseDir, `アップロード結果_${isExecute ? '実行' : 'ドライラン'}.csv`)
  const BOM = '\ufeff'
  const csvLines = [
    'ステータス,フォルダ,画像ベース名,SKU,商品名,画像枚数,エラー',
  ]
  for (const r of results) {
    const statusLabel =
      r.status === 'uploaded'
        ? (isExecute ? 'アップロード済' : 'アップロード予定')
        : r.status === 'skipped_existing'
          ? 'スキップ(既存画像あり)'
          : r.status === 'skipped_no_file'
            ? 'スキップ(ファイルなし)'
            : r.status === 'skipped_dup_sku'
              ? 'スキップ(重複SKU)'
              : 'エラー'
    csvLines.push(
      [
        statusLabel,
        r.folder,
        `"${r.baseName}"`,
        r.sku,
        `"${r.itemName}"`,
        r.imageCount,
        r.error ? `"${r.error}"` : '',
      ].join(',')
    )
  }
  fs.writeFileSync(reportPath, BOM + csvLines.join('\n'), 'utf-8')
  console.log(`\nレポート出力: ${reportPath}`)

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('エラー:', error)
  prisma.$disconnect()
  process.exit(1)
})
