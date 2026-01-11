import { describe, it, expect, afterAll } from 'vitest'
import { prisma } from '@/lib/db/prisma'

describe('Location Integration', () => {
    let createdId: string

    afterAll(async () => {
        if (createdId) {
            await prisma.location.delete({ where: { id: createdId } }).catch(() => { })
        }
    })

    it('should create, read, update, and delete a location', async () => {
        const location = await prisma.location.create({
            data: { name: 'Integration Test Location' }
        })
        createdId = location.id
        expect(location.name).toBe('Integration Test Location')

        const updated = await prisma.location.update({
            where: { id: createdId },
            data: { name: 'Updated Location' }
        })
        expect(updated.name).toBe('Updated Location')

        await prisma.location.delete({ where: { id: createdId } })
        const deleted = await prisma.location.findUnique({ where: { id: createdId } })
        expect(deleted).toBeNull()
        createdId = ''
    })
})
