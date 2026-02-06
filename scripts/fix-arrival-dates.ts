import { PrismaClient } from '@prisma/client'
import { convertExcelSerialDate } from '../lib/utils/date'

const prisma = new PrismaClient({
  log: ['error'],
})

async function main() {
  console.log('🔧 入荷年月データの修正を開始します...')

  // アイテムの入荷年月を修正
  const items = await prisma.item.findMany({
    where: {
      arrivalDate: {
        not: null,
      },
    },
    select: {
      id: true,
      sku: true,
      name: true,
      itemType: true,
      arrivalDate: true,
    },
  })

  console.log(`📦 アイテム: ${items.length}件の入荷年月をチェックします`)

  let updatedCount = 0
  for (const item of items) {
    if (!item.arrivalDate) continue

    const converted = convertExcelSerialDate(item.arrivalDate)

    // 変換前と変換後が異なる場合のみ更新
    if (converted && converted !== item.arrivalDate) {
      await prisma.item.update({
        where: { id: item.id },
        data: { arrivalDate: converted },
      })
      console.log(`  ✓ ${item.sku} ${item.name}: "${item.arrivalDate}" → "${converted}"`)
      updatedCount++
    }
  }

  console.log(`✅ ${updatedCount}件を更新しました`)
}

main()
  .catch((error) => {
    console.error('エラーが発生しました:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
