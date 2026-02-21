import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany({
    select: {
      id: true,
      sku: true,
      name: true,
      itemType: true,
      _count: { select: { images: true } },
    },
    orderBy: { name: 'asc' },
  });

  for (const item of items) {
    console.log(
      [item.sku, item.name, item.itemType, 'images:' + item._count.images].join('\t')
    );
  }
  console.log('---');
  console.log('Total: ' + items.length);
}

main().finally(() => prisma.$disconnect());
