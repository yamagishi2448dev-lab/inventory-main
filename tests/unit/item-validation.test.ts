import { describe, it, expect } from 'vitest'
import {
  productItemSchema,
  consignmentItemSchema,
  itemUpdateSchema,
  itemQuantityUpdateSchema,
  itemBulkDeleteSchema,
  itemBulkEditSchema,
  validateItemCreate,
  validateItemUpdate,
} from '@/lib/validations/item'

describe('Item validation schemas (v3.0)', () => {
  describe('productItemSchema', () => {
    it('should validate a valid product item', () => {
      const valid = {
        name: 'テスト商品',
        costPrice: '10000',
        quantity: 5,
      }
      const result = productItemSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should validate with all optional fields', () => {
      const valid = {
        name: 'テスト商品',
        costPrice: '10000',
        quantity: 5,
        manufacturerId: 'clh1234560000012345678901',
        categoryId: 'clh1234560000012345678902',
        specification: '仕様テキスト',
        size: 'W1200×D600×H400',
        fabricColor: 'ブルー',
        unitId: 'clh1234560000012345678903',
        listPrice: '20000',
        arrivalDate: '2024年1月',
        locationId: 'clh1234560000012345678904',
        designer: 'デザイナー名',
        notes: '備考',
        tagIds: ['clh1234560000012345678905'],
        images: [{ url: 'https://example.com/img.jpg', order: 0 }],
      }
      const result = productItemSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject missing name', () => {
      const invalid = { costPrice: '10000' }
      const result = productItemSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should reject empty name', () => {
      const invalid = { name: '', costPrice: '10000' }
      const result = productItemSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should reject name longer than 200 characters', () => {
      const invalid = { name: 'あ'.repeat(201), costPrice: '10000' }
      const result = productItemSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should reject missing costPrice', () => {
      const invalid = { name: 'テスト商品' }
      const result = productItemSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should reject negative costPrice', () => {
      const invalid = { name: 'テスト商品', costPrice: '-100' }
      const result = productItemSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should reject non-numeric costPrice', () => {
      const invalid = { name: 'テスト商品', costPrice: 'abc' }
      const result = productItemSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should accept zero costPrice', () => {
      const valid = { name: 'テスト商品', costPrice: '0' }
      const result = productItemSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject negative quantity', () => {
      const invalid = { name: 'テスト商品', costPrice: '10000', quantity: -1 }
      const result = productItemSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should reject decimal quantity', () => {
      const invalid = { name: 'テスト商品', costPrice: '10000', quantity: 1.5 }
      const result = productItemSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should default quantity to 0', () => {
      const valid = { name: 'テスト商品', costPrice: '10000' }
      const result = productItemSchema.safeParse(valid)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quantity).toBe(0)
      }
    })

    it('should default itemType to PRODUCT', () => {
      const valid = { name: 'テスト商品', costPrice: '10000' }
      const result = productItemSchema.safeParse(valid)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.itemType).toBe('PRODUCT')
      }
    })
  })

  describe('consignmentItemSchema', () => {
    it('should validate a valid consignment item', () => {
      const valid = { name: '委託品テスト' }
      const result = consignmentItemSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should accept null costPrice', () => {
      const valid = { name: '委託品テスト', costPrice: null }
      const result = consignmentItemSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should default itemType to CONSIGNMENT', () => {
      const valid = { name: '委託品テスト' }
      const result = consignmentItemSchema.safeParse(valid)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.itemType).toBe('CONSIGNMENT')
      }
    })

    it('should reject missing name', () => {
      const invalid = {}
      const result = consignmentItemSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('validateItemCreate', () => {
    it('should validate PRODUCT with costPrice', () => {
      const result = validateItemCreate({
        itemType: 'PRODUCT',
        name: '商品',
        costPrice: '5000',
      })
      expect(result.success).toBe(true)
    })

    it('should validate CONSIGNMENT without costPrice', () => {
      const result = validateItemCreate({
        itemType: 'CONSIGNMENT',
        name: '委託品',
      })
      expect(result.success).toBe(true)
    })

    it('should default to PRODUCT when itemType is omitted', () => {
      const result = validateItemCreate({
        name: '商品',
        costPrice: '5000',
      })
      expect(result.success).toBe(true)
    })

    it('should reject PRODUCT without costPrice', () => {
      const result = validateItemCreate({
        itemType: 'PRODUCT',
        name: '商品',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('validateItemUpdate', () => {
    it('should allow partial update for PRODUCT', () => {
      const result = validateItemUpdate({ name: '更新商品' }, 'PRODUCT')
      expect(result.success).toBe(true)
    })

    it('should reject null costPrice for PRODUCT', () => {
      const result = validateItemUpdate({ costPrice: null }, 'PRODUCT')
      expect(result.success).toBe(false)
    })

    it('should allow null costPrice for CONSIGNMENT', () => {
      const result = validateItemUpdate({ costPrice: null }, 'CONSIGNMENT')
      expect(result.success).toBe(true)
    })
  })

  describe('itemQuantityUpdateSchema', () => {
    it('should accept valid quantity', () => {
      const result = itemQuantityUpdateSchema.safeParse({ quantity: 10 })
      expect(result.success).toBe(true)
    })

    it('should accept zero', () => {
      const result = itemQuantityUpdateSchema.safeParse({ quantity: 0 })
      expect(result.success).toBe(true)
    })

    it('should reject negative', () => {
      const result = itemQuantityUpdateSchema.safeParse({ quantity: -1 })
      expect(result.success).toBe(false)
    })

    it('should reject decimal', () => {
      const result = itemQuantityUpdateSchema.safeParse({ quantity: 1.5 })
      expect(result.success).toBe(false)
    })
  })

  describe('itemBulkDeleteSchema', () => {
    it('should accept valid ids', () => {
      const result = itemBulkDeleteSchema.safeParse({
        ids: ['clh1234560000012345678901'],
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty ids', () => {
      const result = itemBulkDeleteSchema.safeParse({ ids: [] })
      expect(result.success).toBe(false)
    })

    it('should reject more than 100 ids', () => {
      const ids = Array.from({ length: 101 }, (_, i) =>
        `clh12345600000123456789${String(i).padStart(2, '0')}`
      )
      const result = itemBulkDeleteSchema.safeParse({ ids })
      expect(result.success).toBe(false)
    })
  })

  describe('itemBulkEditSchema', () => {
    it('should accept valid bulk edit', () => {
      const result = itemBulkEditSchema.safeParse({
        ids: ['clh1234560000012345678901'],
        updates: {
          locationId: 'clh1234560000012345678902',
        },
      })
      expect(result.success).toBe(true)
    })

    it('should accept quantity set mode', () => {
      const result = itemBulkEditSchema.safeParse({
        ids: ['clh1234560000012345678901'],
        updates: {
          quantity: { mode: 'set', value: 10 },
        },
      })
      expect(result.success).toBe(true)
    })

    it('should accept quantity adjust mode', () => {
      const result = itemBulkEditSchema.safeParse({
        ids: ['clh1234560000012345678901'],
        updates: {
          quantity: { mode: 'adjust', value: -5 },
        },
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty ids', () => {
      const result = itemBulkEditSchema.safeParse({
        ids: [],
        updates: {},
      })
      expect(result.success).toBe(false)
    })
  })
})
