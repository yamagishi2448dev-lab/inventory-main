import { describe, it, expect, afterAll } from 'vitest'
import { prisma } from '@/lib/db/prisma'

describe('Manufacturer Integration', () => {
    let createdId: string

    afterAll(async () => {
        if (createdId) {
            await prisma.manufacturer.delete({ where: { id: createdId } }).catch(() => { })
        }
    })

    it('should create, read, update, and delete a manufacturer', async () => {
        // Create
        const manufacturer = await prisma.manufacturer.create({
            data: { name: 'Integration Test Manufacturer' }
        })
        createdId = manufacturer.id
        expect(manufacturer.name).toBe('Integration Test Manufacturer')

        // Read
        const read = await prisma.manufacturer.findUnique({ where: { id: createdId } })
        expect(read?.name).toBe('Integration Test Manufacturer')

        // Update
        const updated = await prisma.manufacturer.update({
            where: { id: createdId },
            data: { name: 'Updated Manufacturer' }
        })
        expect(updated.name).toBe('Updated Manufacturer')

        // Delete
        await prisma.manufacturer.delete({ where: { id: createdId } })
        const deleted = await prisma.manufacturer.findUnique({ where: { id: createdId } })
        expect(deleted).toBeNull()
        createdId = ''
    })
})
