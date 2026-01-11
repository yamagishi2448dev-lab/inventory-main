import { describe, it, expect } from 'vitest'
import { productSchemaV2 } from '@/lib/validations/product'

describe('productSchemaV2', () => {
    it('should validate a valid V2 product', () => {
        const validData = {
            name: 'Valid Product',
            costPrice: "1000",
            quantity: 10,
            manufacturerId: 'clh1234560000012345678901', // Dummy CUID-like
            unitId: 'clh1234560000012345678902',
            locationId: 'clh1234560000012345678903',
            categoryId: 'clh1234560000012345678904',
            // Optional fields
            specification: 'Spec info',
            fabricColor: 'Red',
            listPrice: "2000",
            arrivalDate: '2025-01',
            notes: 'Some notes',
            images: []
        }

        const result = productSchemaV2.safeParse(validData)
        expect(result.success).toBe(true)
    })

    it('should fail if name is missing', () => {
        const invalidData = {
            costPrice: 1000,
            quantity: 10
        }
        const result = productSchemaV2.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some(i => i.path.includes('name'))).toBe(true)
        }
    })

    it('should fail if costPrice is negative', () => {
        const invalidData = {
            name: 'Product',
            costPrice: -100,
            quantity: 10
        }
        const result = productSchemaV2.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some(i => i.path.includes('costPrice'))).toBe(true)
        }
    })

    it('should validate automatic string conversion for numeric fields if Zod coerces', () => {
        // If schema uses z.coerce.number()
        const validData = {
            name: 'Product',
            costPrice: "1000",
            quantity: "10",
        }
        const result = productSchemaV2.safeParse(validData)
        expect(result.success).toBe(true)
    })
})
