import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/db/prisma'

describe('Dashboard V2 Integration', () => {
    let createdProductIds: string[] = []

    beforeAll(async () => {
        // Create some data for stats
        // Cost: 1000 * 5 = 5000
        const p1 = await prisma.product.create({
            data: {
                name: 'Stats Product 1',
                sku: 'STATS-1',
                costPrice: 1000,
                quantity: 5
            }
        })

        // Cost: 2000 * 2 = 4000
        const p2 = await prisma.product.create({
            data: {
                name: 'Stats Product 2',
                sku: 'STATS-2',
                costPrice: 2000,
                quantity: 2
            }
        })

        createdProductIds = [p1.id, p2.id]
    })

    afterAll(async () => {
        await prisma.product.deleteMany({
            where: { id: { in: createdProductIds } }
        })
    })

    it('should calculate total cost correctly', async () => {
        const products = await prisma.product.findMany({
            where: { id: { in: createdProductIds } },
            select: { costPrice: true, quantity: true }
        })

        const totalCost = products.reduce((sum, p) => {
            return sum + (Number(p.costPrice) * p.quantity)
        }, 0)

        expect(totalCost).toBe(9000)
    })
})
