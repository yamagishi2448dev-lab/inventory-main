import { PrismaClient } from '@prisma/client'
import { convertExcelSerialDate } from '../lib/utils/date'

const prisma = new PrismaClient({
  log: ['error'],
})

async function main() {
  console.log('🔧 入荷年月データの修正を開始します...')

  // 商品の入荷年月を修正
  const products = await prisma.product.findMany({
    where: {
      arrivalDate: {
        not: null,
      },
    },
    select: {
      id: true,
      sku: true,
      name: true,
      arrivalDate: true,
    },
  })

  console.log(`📦 商品: ${products.length}件の入荷年月をチェックします`)

  let updatedProducts = 0
  for (const product of products) {
    if (!product.arrivalDate) continue

    const converted = convertExcelSerialDate(product.arrivalDate)

    // 変換前と変換後が異なる場合のみ更新
    if (converted && converted !== product.arrivalDate) {
      await prisma.product.update({
        where: { id: product.id },
        data: { arrivalDate: converted },
      })
      console.log(`  ✓ ${product.sku} ${product.name}: "${product.arrivalDate}" → "${converted}"`)
      updatedProducts++
    }
  }

  console.log(`✅ 商品: ${updatedProducts}件を更新しました`)

  // 委託品の入荷年月を修正
  const consignments = await prisma.consignment.findMany({
    where: {
      arrivalDate: {
        not: null,
      },
    },
    select: {
      id: true,
      sku: true,
      name: true,
      arrivalDate: true,
    },
  })

  console.log(`📦 委託品: ${consignments.length}件の入荷年月をチェックします`)

  let updatedConsignments = 0
  for (const consignment of consignments) {
    if (!consignment.arrivalDate) continue

    const converted = convertExcelSerialDate(consignment.arrivalDate)

    // 変換前と変換後が異なる場合のみ更新
    if (converted && converted !== consignment.arrivalDate) {
      await prisma.consignment.update({
        where: { id: consignment.id },
        data: { arrivalDate: converted },
      })
      console.log(`  ✓ ${consignment.sku} ${consignment.name}: "${consignment.arrivalDate}" → "${converted}"`)
      updatedConsignments++
    }
  }

  console.log(`✅ 委託品: ${updatedConsignments}件を更新しました`)
  console.log('')
  console.log(`🎉 完了: 合計 ${updatedProducts + updatedConsignments}件を更新しました`)
}

main()
  .catch((error) => {
    console.error('エラーが発生しました:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
