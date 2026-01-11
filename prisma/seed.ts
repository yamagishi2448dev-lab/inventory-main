import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth/password'
import * as fs from 'fs'

const prisma = new PrismaClient({
  log: ['error'],
})

interface CsvRow {
  ID: string
  列1: string
  メーカー: string
  品目: string
  商品名: string
  '仕様　張地/カラー': string
  個数: string
  単位: string
  原価単価: string
  原価合計: string
  定価単価: string
  入荷年月: string
  場所: string
  備考: string
  商品写真: string
}

// CSVパース用のシンプルな関数
function parseCSV(content: string): CsvRow[] {
  const lines = content.split('\n')
  const headers = parseCSVLine(lines[0])
  const rows: CsvRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)
    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    rows.push(row as unknown as CsvRow)
  }

  return rows
}

// CSV行をパース（カンマ区切り、クォート対応）
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

// 価格文字列を数値に変換（例: "42,000 " -> 42000）
function parsePriceString(str: string): number {
  if (!str) return 0
  const cleaned = str.replace(/[,\s"]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

// SKU生成関数（商品用）
function generateSku(index: number): string {
  return `SKU-${(index + 1).toString().padStart(5, '0')}`
}

// SKU生成関数（委託品用）
function generateConsignmentSku(index: number): string {
  return `CSG-${(index + 1).toString().padStart(5, '0')}`
}

async function main() {
  console.log('シードデータを投入しています（v2.1）...')

  // 1. 管理者ユーザーを作成
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  })

  if (!existingAdmin) {
    const passwordHash = await hashPassword('password123')

    await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash,
        role: 'ADMIN',
      },
    })

    console.log('✓ 管理者ユーザーを作成しました')
    console.log('  ログイン情報: username=admin, password=password123')
  } else {
    console.log('✓ 管理者ユーザーは既に存在します')
  }

  // 2. 単位マスタを作成
  console.log('\n単位マスタを作成しています...')
  const unitNames = ['台', '個', '枚', '脚', '式', '本', '点', '箱', '冊', 'セット']
  const unitMap = new Map<string, string>()

  for (const name of unitNames) {
    const unit = await prisma.unit.upsert({
      where: { name },
      update: {},
      create: { name },
    })
    unitMap.set(name, unit.id)
  }
  console.log(`✓ ${unitNames.length}件の単位を作成しました`)

  // 3. 場所マスタを作成
  console.log('\n場所マスタを作成しています...')
  const locationNames = ['SRバックヤード', '粟崎', 'リンテルノ展示', '不明・破棄', '貸出']
  const locationMap = new Map<string, string>()

  for (const name of locationNames) {
    const location = await prisma.location.upsert({
      where: { name },
      update: {},
      create: { name },
    })
    locationMap.set(name, location.id)
  }
  console.log(`✓ ${locationNames.length}件の場所を作成しました`)

  // 4. 素材項目マスタを作成（v2.1追加）
  console.log('\n素材項目マスタを作成しています...')
  const materialTypes = [
    { name: '張地', order: 0 },
    { name: '木部', order: 1 },
    { name: '脚部', order: 2 },
  ]

  for (const { name, order } of materialTypes) {
    await prisma.materialType.upsert({
      where: { name },
      update: { order },
      create: { name, order },
    })
  }
  console.log(`✓ ${materialTypes.length}件の素材項目を作成しました`)

  // 5. システム設定を作成（v2.1追加）
  console.log('\nシステム設定を作成しています...')
  const operationRules = `【在庫管理システム 運用ルール】

■ 商品登録
・新しい商品を入荷したら、必ず商品登録を行ってください
・写真は正面から撮影し、メイン画像として設定してください

■ 販売済み処理
・商品が売れたら「販売済み」にチェックを入れてください
・毎月末の棚卸し時に、販売済み商品を削除します

■ 委託品
・委託品は「委託品一覧」で管理してください
・原価は0円で登録されています`

  await prisma.systemSetting.upsert({
    where: { key: 'operation_rules' },
    update: { value: operationRules },
    create: { key: 'operation_rules', value: operationRules },
  })
  console.log('✓ システム設定を作成しました')

  // 6. CSVファイルを読み込む
  console.log('\n在庫データを読み込んでいます...')
  const csvContent = fs.readFileSync('在庫表2025.10 - 在庫一覧.csv', 'utf-8')
  const rows = parseCSV(csvContent)

  console.log(`✓ ${rows.length}件の商品データを読み込みました`)

  // 7. ユニークなメーカー、品目を抽出
  const manufacturers = [...new Set(rows.map(r => r['メーカー']).filter(Boolean))]
  const categories = [...new Set(rows.map(r => r['品目']).filter(Boolean))]

  // CSVからの場所も追加
  const csvLocations = [...new Set(rows.map(r => r['場所']).filter(Boolean))]
  for (const name of csvLocations) {
    if (!locationMap.has(name)) {
      const location = await prisma.location.upsert({
        where: { name },
        update: {},
        create: { name },
      })
      locationMap.set(name, location.id)
    }
  }

  // CSVからの単位も追加
  const csvUnits = [...new Set(rows.map(r => r['単位']).filter(Boolean))]
  for (const name of csvUnits) {
    if (!unitMap.has(name)) {
      const unit = await prisma.unit.upsert({
        where: { name },
        update: {},
        create: { name },
      })
      unitMap.set(name, unit.id)
    }
  }

  console.log(`\n抽出されたデータ:`)
  console.log(`  メーカー: ${manufacturers.length}件`)
  console.log(`  品目: ${categories.length}件`)
  console.log(`  場所: ${locationMap.size}件`)
  console.log(`  単位: ${unitMap.size}件`)

  // 8. メーカーを作成
  console.log('\nメーカーを作成しています...')
  const manufacturerMap = new Map<string, string>()

  for (const name of manufacturers) {
    const manufacturer = await prisma.manufacturer.upsert({
      where: { name },
      update: {},
      create: { name },
    })
    manufacturerMap.set(name, manufacturer.id)
  }
  console.log(`✓ ${manufacturers.length}件のメーカーを作成しました`)

  // 9. 品目（カテゴリ）を作成
  console.log('\n品目を作成しています...')
  const categoryMap = new Map<string, string>()

  for (const name of categories) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    })
    categoryMap.set(name, category.id)
  }
  console.log(`✓ ${categories.length}件の品目を作成しました`)

  // 10. 商品を作成
  console.log('\n商品を作成しています...')
  let createdCount = 0
  let skippedCount = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const sku = generateSku(i)
      const rawName = row['商品名']
      const name = rawName ? String(rawName) : '商品名不明'
      const manufacturer = row['メーカー']
      const category = row['品目']
      const location = row['場所']
      const specification = row['仕様　張地/カラー'] || null
      const quantity = parseInt(row['個数']) || 0
      const unit = row['単位']
      const costPrice = parsePriceString(row['原価単価'])
      const listPrice = parsePriceString(row['定価単価'])
      const arrivalDate = row['入荷年月'] || null
      const notes = row['備考'] || null

      // 既存の商品をチェック
      const existing = await prisma.product.findUnique({
        where: { sku },
      })

      if (existing) {
        skippedCount++
        continue
      }

      // 商品を作成
      await prisma.product.create({
        data: {
          sku,
          name,
          specification: specification || undefined,
          fabricColor: undefined, // CSVでは仕様と一緒に入っているため、specificationに格納
          quantity,
          costPrice: costPrice.toString(),
          listPrice: listPrice > 0 ? listPrice.toString() : undefined,
          arrivalDate: arrivalDate || undefined,
          notes: notes || undefined,
          categoryId: category ? categoryMap.get(category) : undefined,
          manufacturerId: manufacturer ? manufacturerMap.get(manufacturer) : undefined,
          unitId: unit ? unitMap.get(unit) : undefined,
          locationId: location ? locationMap.get(location) : undefined,
        },
      })

      createdCount++

      if (createdCount % 100 === 0) {
        console.log(`  ${createdCount}件の商品を作成しました...`)
      }
    } catch (error) {
      console.error(`商品の作成に失敗しました (行: ${i + 1}):`, error)
    }
  }

  console.log(`\n✓ 商品の作成が完了しました`)
  console.log(`  作成: ${createdCount}件`)
  console.log(`  スキップ: ${skippedCount}件`)

  // 11. 委託品を作成（v2.1追加）- 商品と同じデータ、原価0
  console.log('\n委託品を作成しています（原価0円）...')
  let consignmentCreatedCount = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const sku = generateConsignmentSku(i)
      const rawName = row['商品名']
      const name = rawName ? String(rawName) : '商品名不明'
      const manufacturer = row['メーカー']
      const category = row['品目']
      const location = row['場所']
      const specification = row['仕様　張地/カラー'] || null
      const quantity = parseInt(row['個数']) || 0
      const unit = row['単位']
      const listPrice = parsePriceString(row['定価単価'])
      const arrivalDate = row['入荷年月'] || null
      const notes = row['備考'] || null

      // 既存の委託品をチェック
      const existing = await prisma.consignment.findUnique({
        where: { sku },
      })

      if (existing) {
        continue
      }

      // 委託品を作成（原価は0）
      await prisma.consignment.create({
        data: {
          sku,
          name,
          specification: specification || undefined,
          fabricColor: undefined,
          quantity,
          costPrice: '0', // 原価は常に0
          listPrice: listPrice > 0 ? listPrice.toString() : undefined,
          arrivalDate: arrivalDate || undefined,
          notes: notes || undefined,
          categoryId: category ? categoryMap.get(category) : undefined,
          manufacturerId: manufacturer ? manufacturerMap.get(manufacturer) : undefined,
          unitId: unit ? unitMap.get(unit) : undefined,
          locationId: location ? locationMap.get(location) : undefined,
        },
      })

      consignmentCreatedCount++

      if (consignmentCreatedCount % 100 === 0) {
        console.log(`  ${consignmentCreatedCount}件の委託品を作成しました...`)
      }
    } catch (error) {
      console.error(`委託品の作成に失敗しました (行: ${i + 1}):`, error)
    }
  }

  console.log(`\n✓ 委託品の作成が完了しました`)
  console.log(`  作成: ${consignmentCreatedCount}件`)

  console.log('\n=== シードデータの投入が完了しました（v2.1） ===')
  console.log(`商品総数: ${createdCount}`)
  console.log(`委託品総数: ${consignmentCreatedCount}`)
  console.log(`品目数: ${categories.length}`)
  console.log(`メーカー数: ${manufacturers.length}`)
  console.log(`場所数: ${locationMap.size}`)
  console.log(`単位数: ${unitMap.size}`)
  console.log(`素材項目数: ${materialTypes.length}`)
}

main()
  .catch((e) => {
    console.error('シードデータの投入中にエラーが発生しました:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
