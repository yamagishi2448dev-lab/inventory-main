import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth/password'

const prisma = new PrismaClient({
  log: ['error'],
})

async function main() {
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

  console.log('Seeded admin user: username=admin, password=password123')
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })