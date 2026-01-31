import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth/password'
import { parse } from 'csv-parse/sync'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient({
  log: ['error'],
})

// 金額文字列を数値に変換（"91,640 " → 91640）
function parsePrice(priceStr: string | undefined): number {
  if (!priceStr || priceStr.trim() === '') return 0
  const cleaned = priceStr.replace(/[,\s]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

// 数量文字列を整数に変換
function parseQuantity(qtyStr: string | undefined): number {
  if (!qtyStr || qtyStr.trim() === '') return 0
  const num = parseInt(qtyStr.trim(), 10)
  return isNaN(num) ? 0 : num
}

// Excelシリアル日付を「YYYY年M月」形式に変換
function convertExcelSerialDate(value: string | undefined): string | null {
  if (!value || value.trim() === '') return null
  const trimmed = value.trim()

  // 既に年月形式の場合はそのまま返す
  if (trimmed.includes('年')) return trimmed

  // 数値の場合はExcelシリアル日付として変換
  const serialNumber = parseInt(trimmed, 10)
  if (isNaN(serialNumber) || serialNumber < 1) return trimmed

  // Excel日付 → JavaScript Date変換
  // Excelの日付シリアル値は1900年1月1日を1とする（1900年2月29日のバグあり）
  const excelEpochDiff = 25569 // 1970-01-01からの日数差
  const millisecondsPerDay = 86400 * 1000
  // Excel 1900年バグ対応: 60（1900年2月29日）より大きい場合は1日減らす
  const adjustedSerial = serialNumber > 59 ? serialNumber - 1 : serialNumber
  const date = new Date((adjustedSerial - excelEpochDiff) * millisecondsPerDay)

  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月`
}

async function main() {
  console.log('🗑️  Clearing existing data...')

  // 既存データをすべて削除（順序に注意）
  await prisma.productTag.deleteMany()
  await prisma.consignmentTag.deleteMany()
  await prisma.tag.deleteMany()
  await prisma.productMaterial.deleteMany()
  await prisma.consignmentMaterial.deleteMany()
  await prisma.materialType.deleteMany()
  await prisma.productImage.deleteMany()
  await prisma.consignmentImage.deleteMany()
  await prisma.product.deleteMany()
  await prisma.consignment.deleteMany()
  await prisma.manufacturer.deleteMany()
  await prisma.category.deleteMany()
  await prisma.location.deleteMany()
  await prisma.unit.deleteMany()
  await prisma.changeLog.deleteMany()
  await prisma.systemSetting.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()

  console.log('✓ All existing data cleared')

  // 1. Adminユーザー作成
  const passwordHash = await hashPassword('password123')
  await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash,
      role: 'ADMIN',
    },
  })
  console.log('✓ Created admin user: username=admin, password=password123')

  // 2. CSVファイルを読み込み
  const csvPath = path.join(process.cwd(), '2025.12.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
  }) as Record<string, string>[]

  // 空行をフィルタリング（メーカー名が空の行を除外）
  const validRecords = records.filter(record => {
    const manufacturer = record['メーカー']?.trim()
    return manufacturer && manufacturer.length > 0
  })

  console.log(`✓ Loaded ${validRecords.length} valid records from CSV (${records.length} total rows)`)

  // 3. ユニークなマスタデータを抽出
  const manufacturerNames = new Set<string>()
  const categoryNames = new Set<string>()
  const locationNames = new Set<string>()
  const unitNames = new Set<string>()

  for (const record of validRecords) {
    const manufacturer = record['メーカー']?.trim()
    const category = record['品目']?.trim()
    const location = record['場所']?.trim()
    const unit = record['単位']?.trim()

    if (manufacturer) manufacturerNames.add(manufacturer)
    if (category) categoryNames.add(category)
    if (location) locationNames.add(location)
    if (unit) unitNames.add(unit)
  }

  // 4. 単位マスタ作成
  const unitMap = new Map<string, string>()
  for (const name of unitNames) {
    const unit = await prisma.unit.create({ data: { name } })
    unitMap.set(name, unit.id)
  }
  console.log(`✓ Created ${unitNames.size} units`)

  // 5. 場所マスタ作成
  const locationMap = new Map<string, string>()
  for (const name of locationNames) {
    const location = await prisma.location.create({ data: { name } })
    locationMap.set(name, location.id)
  }
  console.log(`✓ Created ${locationNames.size} locations`)

  // 6. メーカーマスタ作成
  const manufacturerMap = new Map<string, string>()
  for (const name of manufacturerNames) {
    const manufacturer = await prisma.manufacturer.create({ data: { name } })
    manufacturerMap.set(name, manufacturer.id)
  }
  console.log(`✓ Created ${manufacturerNames.size} manufacturers`)

  // 7. 品目マスタ作成
  const categoryMap = new Map<string, string>()
  for (const name of categoryNames) {
    const category = await prisma.category.create({ data: { name } })
    categoryMap.set(name, category.id)
  }
  console.log(`✓ Created ${categoryNames.size} categories`)

  // 8. タグ「玉家建設用」を作成
  const tag = await prisma.tag.create({
    data: { name: '玉家建設用' }
  })
  console.log('✓ Created tag: 玉家建設用')

  // 9. SKU採番用の初期設定
  await prisma.systemSetting.create({
    data: { key: 'next_product_sku', value: '1' },
  })
  await prisma.systemSetting.create({
    data: { key: 'next_consignment_sku', value: '1' },
  })

  // 10. 商品データ作成
  let skuCounter = 1
  let productCount = 0

  for (const record of validRecords) {
    const name = record['商品名']?.trim()
    if (!name) continue // 商品名がない行はスキップ

    const manufacturer = record['メーカー']?.trim()
    const category = record['品目']?.trim()
    const specification = record['仕様　張地/カラー']?.trim() || null
    const quantity = parseQuantity(record['個数'])
    const unit = record['単位']?.trim()
    const costPrice = parsePrice(record['原価単価'])
    const listPrice = parsePrice(record['定価単価'])
    const arrivalDate = convertExcelSerialDate(record['入荷年月'])
    const location = record['場所']?.trim()
    const notes = record['備考']?.trim() || null

    const sku = `SKU-${String(skuCounter).padStart(5, '0')}`
    skuCounter++

    await prisma.product.create({
      data: {
        sku,
        name,
        manufacturerId: manufacturer ? manufacturerMap.get(manufacturer) : null,
        categoryId: category ? categoryMap.get(category) : null,
        specification,
        fabricColor: null,
        quantity,
        unitId: unit ? unitMap.get(unit) : null,
        costPrice,
        listPrice: listPrice > 0 ? listPrice : null,
        arrivalDate,
        locationId: location ? locationMap.get(location) : null,
        notes,
      },
    })
    productCount++
  }

  // SKUカウンターを更新
  await prisma.systemSetting.update({
    where: { key: 'next_product_sku' },
    data: { value: String(skuCounter) },
  })
  console.log(`✓ Created ${productCount} products (from ${validRecords.length} valid records)`)

  // 11. 委託品テストデータ3件作成
  const consignmentData = [
    {
      sku: 'CSG-00001',
      name: '委託ソファ（サンプル）',
      specification: '2人掛け',
      quantity: 1,
      costPrice: 0,
      listPrice: 120000,
      notes: '委託品テストデータ',
    },
    {
      sku: 'CSG-00002',
      name: '委託テーブル（サンプル）',
      specification: 'W1400×D800',
      quantity: 1,
      costPrice: 0,
      listPrice: 85000,
      notes: '委託品テストデータ',
    },
    {
      sku: 'CSG-00003',
      name: '委託チェア（サンプル）',
      specification: 'ダイニングチェア',
      quantity: 2,
      costPrice: 0,
      listPrice: 45000,
      notes: '委託品テストデータ',
    },
  ]

  for (const data of consignmentData) {
    const consignment = await prisma.consignment.create({
      data: {
        sku: data.sku,
        name: data.name,
        specification: data.specification,
        quantity: data.quantity,
        costPrice: data.costPrice,
        listPrice: data.listPrice,
        notes: data.notes,
        locationId: locationMap.get('SRバックヤード') || null,
        unitId: unitMap.get('台') || null,
      },
    })
    // タグを紐付け
    await prisma.consignmentTag.create({
      data: {
        consignmentId: consignment.id,
        tagId: tag.id,
      },
    })
  }

  // 委託品SKUカウンターを更新
  await prisma.systemSetting.update({
    where: { key: 'next_consignment_sku' },
    data: { value: '4' },
  })
  console.log('✓ Created 3 sample consignments with tag')

  console.log('')
  console.log('✅ Production seed completed successfully!')
  console.log('')
  console.log('Summary:')
  console.log(`  - Admin user: admin / password123`)
  console.log(`  - Products: ${productCount} (from ${validRecords.length} CSV records)`)
  console.log(`  - Consignments: 3 (test data)`)
  console.log(`  - Manufacturers: ${manufacturerNames.size}`)
  console.log(`  - Categories: ${categoryNames.size}`)
  console.log(`  - Locations: ${locationNames.size}`)
  console.log(`  - Units: ${unitNames.size}`)
  console.log(`  - Tags: 1 (玉家建設用)`)
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
