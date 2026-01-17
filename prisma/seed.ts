import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth/password'

const prisma = new PrismaClient({
  log: ['error'],
})

async function main() {
  // 1. Adminユーザー作成
  const passwordHash = await hashPassword('password123')

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash,
      role: 'ADMIN',
    },
    create: {
      username: 'admin',
      passwordHash,
      role: 'ADMIN',
    },
  })

  console.log('✓ Seeded admin user: username=admin, password=password123')

  // 2. 単位マスタ
  const units = ['台', '個', '枚', '脚', '式', '本', '点', '箱', '冊', 'セット']
  for (const unitName of units) {
    await prisma.unit.upsert({
      where: { name: unitName },
      update: {},
      create: { name: unitName },
    })
  }
  console.log(`✓ Seeded ${units.length} units`)

  // 3. 場所マスタ
  const locations = ['SRバックヤード', '粟崎', 'リンテルノ展示', '不明・破棄', '貸出']
  for (const locationName of locations) {
    await prisma.location.upsert({
      where: { name: locationName },
      update: {},
      create: { name: locationName },
    })
  }
  console.log(`✓ Seeded ${locations.length} locations`)

  // 4. メーカーマスタ（サンプル）
  const manufacturers = ['サンプルメーカーA', 'サンプルメーカーB', 'サンプルメーカーC']
  for (const manufacturerName of manufacturers) {
    await prisma.manufacturer.upsert({
      where: { name: manufacturerName },
      update: {},
      create: { name: manufacturerName },
    })
  }
  console.log(`✓ Seeded ${manufacturers.length} manufacturers`)

  // 5. 品目マスタ（サンプル）
  const categories = ['家具', '雑貨', '照明', 'インテリア']
  for (const categoryName of categories) {
    await prisma.category.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName },
    })
  }
  console.log(`✓ Seeded ${categories.length} categories`)

  // 6. サンプル商品データ
  const unitTai = await prisma.unit.findFirst({ where: { name: '台' } })
  const locationSr = await prisma.location.findFirst({ where: { name: 'SRバックヤード' } })
  const manufacturerA = await prisma.manufacturer.findFirst({ where: { name: 'サンプルメーカーA' } })
  const categoryKagu = await prisma.category.findFirst({ where: { name: '家具' } })

  // SKU採番用の初期設定
  await prisma.systemSetting.upsert({
    where: { key: 'next_product_sku' },
    update: {},
    create: { key: 'next_product_sku', value: '1' },
  })

  await prisma.systemSetting.upsert({
    where: { key: 'next_consignment_sku' },
    update: {},
    create: { key: 'next_consignment_sku', value: '1' },
  })

  const sampleProducts = [
    {
      sku: 'SKU-00001',
      name: 'サンプルソファ',
      manufacturerId: manufacturerA?.id,
      categoryId: categoryKagu?.id,
      specification: '3人掛け',
      fabricColor: 'ベージュ',
      quantity: 2,
      unitId: unitTai?.id,
      costPrice: 45000,
      listPrice: 89800,
      locationId: locationSr?.id,
      arrivalDate: '2026年1月',
      notes: 'サンプル商品データ',
    },
    {
      sku: 'SKU-00002',
      name: 'サンプルテーブル',
      manufacturerId: manufacturerA?.id,
      categoryId: categoryKagu?.id,
      specification: 'W1200×D800',
      fabricColor: 'ウォールナット',
      quantity: 1,
      unitId: unitTai?.id,
      costPrice: 32000,
      listPrice: 68000,
      locationId: locationSr?.id,
      arrivalDate: '2026年1月',
    },
    {
      sku: 'SKU-00003',
      name: 'サンプルチェア',
      manufacturerId: manufacturerA?.id,
      categoryId: categoryKagu?.id,
      specification: 'ダイニングチェア',
      fabricColor: 'グレー',
      quantity: 4,
      unitId: unitTai?.id,
      costPrice: 8500,
      listPrice: 18900,
      locationId: locationSr?.id,
      arrivalDate: '2026年1月',
    },
  ]

  for (const product of sampleProducts) {
    await prisma.product.create({ data: product })
  }

  console.log(`✓ Seeded ${sampleProducts.length} sample products`)

  // SKUカウンターを更新
  await prisma.systemSetting.update({
    where: { key: 'next_product_sku' },
    data: { value: '4' },
  })

  console.log('✅ All seed data created successfully')
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })