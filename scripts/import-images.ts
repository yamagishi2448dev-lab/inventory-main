/**
 * 商品画像一括インポートスクリプト
 *
 * 使い方:
 *   npx tsx scripts/import-images.ts <画像フォルダのパス>
 *
 * フォルダ構成:
 *   images/
 *   ├── SKU-00001/
 *   │   ├── 1.jpg    → メイン画像 (order: 0)
 *   │   ├── 2.jpg    → 2枚目 (order: 1)
 *   │   └── 3.png    → 3枚目 (order: 2)
 *   ├── SKU-00002/
 *   │   └── 1.webp
 *   └── ...
 *
 * 対応画像形式: JPEG, PNG, WebP
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

// 許可される画像形式
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

interface ImportResult {
  sku: string
  success: boolean
  imagesImported: number
  error?: string
}

async function importImages(sourceDir: string): Promise<void> {
  console.log('========================================')
  console.log('商品画像一括インポート')
  console.log('========================================')
  console.log(`ソースフォルダ: ${sourceDir}`)
  console.log('')

  // ソースフォルダの存在確認
  if (!fs.existsSync(sourceDir)) {
    console.error(`エラー: フォルダが見つかりません: ${sourceDir}`)
    process.exit(1)
  }

  // アップロード先ディレクトリの確認・作成
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
    console.log(`アップロードフォルダを作成しました: ${uploadDir}`)
  }

  // SKUフォルダの一覧を取得
  const skuFolders = fs
    .readdirSync(sourceDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

  if (skuFolders.length === 0) {
    console.log('インポート対象のSKUフォルダが見つかりません')
    process.exit(0)
  }

  console.log(`${skuFolders.length}件のSKUフォルダを検出しました`)
  console.log('')

  const results: ImportResult[] = []
  let totalImported = 0
  let totalSkipped = 0
  let totalErrors = 0

  for (const skuFolder of skuFolders) {
    const sku = skuFolder // フォルダ名がSKU
    const skuPath = path.join(sourceDir, skuFolder)

    // 商品の存在確認
    const product = await prisma.product.findUnique({
      where: { sku },
      include: { images: true },
    })

    if (!product) {
      console.log(`[スキップ] ${sku}: 商品が見つかりません`)
      results.push({
        sku,
        success: false,
        imagesImported: 0,
        error: '商品が見つかりません',
      })
      totalSkipped++
      continue
    }

    // 既存画像がある場合は警告
    if (product.images.length > 0) {
      console.log(`[警告] ${sku}: 既存の画像が${product.images.length}件あります。追加します。`)
    }

    // フォルダ内の画像ファイルを取得
    const imageFiles = fs
      .readdirSync(skuPath, { withFileTypes: true })
      .filter((dirent) => {
        if (!dirent.isFile()) return false
        const ext = path.extname(dirent.name).toLowerCase()
        return ALLOWED_EXTENSIONS.includes(ext)
      })
      .map((dirent) => dirent.name)
      .sort((a, b) => {
        // ファイル名を数値でソート (1.jpg, 2.jpg, 10.jpg...)
        const numA = parseInt(path.basename(a, path.extname(a)), 10) || 0
        const numB = parseInt(path.basename(b, path.extname(b)), 10) || 0
        return numA - numB
      })

    if (imageFiles.length === 0) {
      console.log(`[スキップ] ${sku}: 画像ファイルがありません`)
      results.push({
        sku,
        success: false,
        imagesImported: 0,
        error: '画像ファイルがありません',
      })
      totalSkipped++
      continue
    }

    // 画像をコピーしてDBに登録
    let importedCount = 0
    const existingMaxOrder = product.images.length > 0
      ? Math.max(...product.images.map((img) => img.order))
      : -1

    try {
      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i]
        const sourcePath = path.join(skuPath, imageFile)
        const ext = path.extname(imageFile).toLowerCase()

        // ランダムなファイル名を生成
        const randomString = crypto.randomBytes(16).toString('hex')
        const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '')
        const newFilename = `${timestamp}_${randomString}${ext}`
        const destPath = path.join(uploadDir, newFilename)

        // ファイルをコピー
        fs.copyFileSync(sourcePath, destPath)

        // DBに登録
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: `/uploads/${newFilename}`,
            order: existingMaxOrder + 1 + i,
          },
        })

        importedCount++
      }

      console.log(`[成功] ${sku}: ${importedCount}件の画像をインポートしました`)
      results.push({
        sku,
        success: true,
        imagesImported: importedCount,
      })
      totalImported += importedCount
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー'
      console.error(`[エラー] ${sku}: ${errorMessage}`)
      results.push({
        sku,
        success: false,
        imagesImported: importedCount,
        error: errorMessage,
      })
      totalErrors++
    }
  }

  // サマリー
  console.log('')
  console.log('========================================')
  console.log('インポート完了')
  console.log('========================================')
  console.log(`処理フォルダ数: ${skuFolders.length}`)
  console.log(`成功: ${results.filter((r) => r.success).length}件`)
  console.log(`スキップ: ${totalSkipped}件`)
  console.log(`エラー: ${totalErrors}件`)
  console.log(`インポート画像数: ${totalImported}件`)

  // エラーがあった場合は一覧を表示
  const errors = results.filter((r) => !r.success && r.error !== '商品が見つかりません' && r.error !== '画像ファイルがありません')
  if (errors.length > 0) {
    console.log('')
    console.log('エラー詳細:')
    errors.forEach((r) => {
      console.log(`  ${r.sku}: ${r.error}`)
    })
  }

  await prisma.$disconnect()
}

// メイン実行
const args = process.argv.slice(2)
if (args.length === 0) {
  console.log('使い方: npx tsx scripts/import-images.ts <画像フォルダのパス>')
  console.log('')
  console.log('例: npx tsx scripts/import-images.ts ./product-images')
  console.log('')
  console.log('フォルダ構成:')
  console.log('  product-images/')
  console.log('  ├── SKU-00001/')
  console.log('  │   ├── 1.jpg')
  console.log('  │   └── 2.jpg')
  console.log('  └── SKU-00002/')
  console.log('      └── 1.png')
  process.exit(1)
}

const sourceDir = path.resolve(args[0])
importImages(sourceDir).catch((error) => {
  console.error('予期せぬエラーが発生しました:', error)
  process.exit(1)
})
