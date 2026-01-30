import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

// 本番環境でもクライアントをキャッシュしてコネクション再利用
globalForPrisma.prisma = prisma
