import { vi, describe, it, expect } from 'vitest'
import { generateSku, generateConsignmentSku, generateItemSku, isValidSkuFormat, isValidConsignmentSkuFormat, isValidItemSkuFormat, getItemTypeFromSku } from '@/lib/utils/sku'
import { prisma } from '@/lib/db/prisma'

vi.mock('@/lib/db/prisma', () => ({
    prisma: {
        $transaction: vi.fn(),
    },
}))

describe('SKU generation', () => {
    describe('generateSku', () => {
        it('should generate SKU-00001 when counter is 1', async () => {
            vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
                return fn({
                    systemSetting: {
                        findUnique: vi.fn().mockResolvedValue({ key: 'next_product_sku', value: '1' }),
                        upsert: vi.fn(),
                    },
                })
            })
            // generateSku uses $transaction internally, returning the counter number
            vi.mocked(prisma.$transaction).mockResolvedValue(1)

            const sku = await generateSku()
            expect(sku).toBe('SKU-00001')
        })

        it('should generate SKU-00099 when counter is 99', async () => {
            vi.mocked(prisma.$transaction).mockResolvedValue(99)

            const sku = await generateSku()
            expect(sku).toBe('SKU-00099')
        })
    })

    describe('generateConsignmentSku', () => {
        it('should generate CSG-00001 when counter is 1', async () => {
            vi.mocked(prisma.$transaction).mockResolvedValue(1)

            const sku = await generateConsignmentSku()
            expect(sku).toBe('CSG-00001')
        })
    })

    describe('generateItemSku', () => {
        it('should generate SKU prefix for PRODUCT', async () => {
            vi.mocked(prisma.$transaction).mockResolvedValue(5)

            const sku = await generateItemSku('PRODUCT')
            expect(sku).toBe('SKU-00005')
        })

        it('should generate CSG prefix for CONSIGNMENT', async () => {
            vi.mocked(prisma.$transaction).mockResolvedValue(3)

            const sku = await generateItemSku('CONSIGNMENT')
            expect(sku).toBe('CSG-00003')
        })
    })
})

describe('SKU format validation', () => {
    describe('isValidSkuFormat', () => {
        it('should accept valid product SKU', () => {
            expect(isValidSkuFormat('SKU-00001')).toBe(true)
            expect(isValidSkuFormat('SKU-99999')).toBe(true)
        })

        it('should reject invalid SKU', () => {
            expect(isValidSkuFormat('CSG-00001')).toBe(false)
            expect(isValidSkuFormat('SKU-0001')).toBe(false)
            expect(isValidSkuFormat('SKU00001')).toBe(false)
            expect(isValidSkuFormat('')).toBe(false)
        })
    })

    describe('isValidConsignmentSkuFormat', () => {
        it('should accept valid consignment SKU', () => {
            expect(isValidConsignmentSkuFormat('CSG-00001')).toBe(true)
            expect(isValidConsignmentSkuFormat('CSG-99999')).toBe(true)
        })

        it('should reject invalid SKU', () => {
            expect(isValidConsignmentSkuFormat('SKU-00001')).toBe(false)
            expect(isValidConsignmentSkuFormat('CSG-0001')).toBe(false)
        })
    })

    describe('isValidItemSkuFormat', () => {
        it('should accept both product and consignment SKU', () => {
            expect(isValidItemSkuFormat('SKU-00001')).toBe(true)
            expect(isValidItemSkuFormat('CSG-00001')).toBe(true)
        })

        it('should reject invalid formats', () => {
            expect(isValidItemSkuFormat('OTHER-001')).toBe(false)
            expect(isValidItemSkuFormat('')).toBe(false)
        })
    })

    describe('getItemTypeFromSku', () => {
        it('should return PRODUCT for SKU- prefix', () => {
            expect(getItemTypeFromSku('SKU-00001')).toBe('PRODUCT')
        })

        it('should return CONSIGNMENT for CSG- prefix', () => {
            expect(getItemTypeFromSku('CSG-00001')).toBe('CONSIGNMENT')
        })

        it('should return null for unknown prefix', () => {
            expect(getItemTypeFromSku('OTHER-001')).toBeNull()
        })
    })
})
