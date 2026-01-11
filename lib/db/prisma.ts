import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

type PrismaClientSingleton = PrismaClient

const createPrismaClient = (): PrismaClientSingleton => {
  const dataSourceUrl = process.env.PRISMA_DATABASE_URL ?? process.env.DATABASE_URL
  const useAccelerate = Boolean(
    dataSourceUrl && dataSourceUrl.startsWith('prisma+postgres://')
  )

  const client = dataSourceUrl
    ? new PrismaClient({ datasourceUrl: dataSourceUrl })
    : new PrismaClient()

  const extended = useAccelerate ? client.$extends(withAccelerate()) : client
  return extended as PrismaClientSingleton
}

const globalForPrisma = global as unknown as {
  prisma?: PrismaClientSingleton
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
