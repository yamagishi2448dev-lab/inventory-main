import { describe, it, expect, afterAll } from 'vitest'
import { prisma } from '@/lib/db/prisma'

describe('Unit Integration', () => {
    let createdId: string

    afterAll(async () => {
        if (createdId) {
            await prisma.unit.delete({ where: { id: createdId } }).catch(() => { })
        }
    })

    it('should create, read, update, and delete a unit', async () => {
        const unit = await prisma.unit.create({
            data: { name: 'Integration Test Unit' }
        })
        createdId = unit.id
        expect(unit.name).toBe('Integration Test Unit')

        const updated = await prisma.unit.update({
            where: { id: createdId },
            data: { name: 'Updated Unit' }
        })
        expect(updated.name).toBe('Updated Unit')

        await prisma.unit.delete({ where: { id: createdId } })
        const deleted = await prisma.unit.findUnique({ where: { id: createdId } })
        expect(deleted).toBeNull()
        createdId = ''
    })
})
