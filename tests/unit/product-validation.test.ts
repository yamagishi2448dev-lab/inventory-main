import { describe, it, expect } from 'vitest'
import {
  productSchema,
  productUpdateSchema,
  stockUpdateSchema,
} from '@/lib/validations/product'

describe('Product validation schemas', () => {
  describe('productSchema', () => {
    it('should validate a valid product', () => {
      const validProduct = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: '1000',
        stock: 10,
        description: 'Test description',
        categoryId: 'clxxxxxxxxxxxxxxxxxxxx',
        supplierId: 'clxxxxxxxxxxxxxxxxxxxx',
        tagIds: ['clxxxxxxxxxxxxxxxxxxxx'],
      }

      const result = productSchema.safeParse(validProduct)
      expect(result.success).toBe(true)
    })

    it('should validate product with minimal fields', () => {
      const minimalProduct = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: '0',
      }

      const result = productSchema.safeParse(minimalProduct)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.stock).toBe(0) // default value
        expect(result.data.tagIds).toEqual([]) // default value
      }
    })

    describe('name field', () => {
      it('should reject empty name', () => {
        const product = {
          name: '',
          sku: 'TEST-001',
          price: '1000',
        }

        const result = productSchema.safeParse(product)
        expect(result.success).toBe(false)
      })

      it('should reject name longer than 200 characters', () => {
        const product = {
          name: 'a'.repeat(201),
          sku: 'TEST-001',
          price: '1000',
        }

        const result = productSchema.safeParse(product)
        expect(result.success).toBe(false)
      })

      it('should accept name with 200 characters', () => {
        const product = {
          name: 'a'.repeat(200),
          sku: 'TEST-001',
          price: '1000',
        }

        const result = productSchema.safeParse(product)
        expect(result.success).toBe(true)
      })
    })

    describe('sku field', () => {
      it('should accept alphanumeric SKU', () => {
        const product = {
          name: 'Test',
          sku: 'ABC123',
          price: '1000',
        }

        const result = productSchema.safeParse(product)
        expect(result.success).toBe(true)
      })

      it('should accept SKU with hyphens and underscores', () => {
        const product = {
          name: 'Test',
          sku: 'ABC-123_456',
          price: '1000',
        }

        const result = productSchema.safeParse(product)
        expect(result.success).toBe(true)
      })

      it('should reject SKU with spaces', () => {
        const product = {
          name: 'Test',
          sku: 'ABC 123',
          price: '1000',
        }

        const result = productSchema.safeParse(product)
        expect(result.success).toBe(false)
      })

      it('should reject SKU with special characters', () => {
        const product = {
          name: 'Test',
          sku: 'ABC@123',
          price: '1000',
        }

        const result = productSchema.safeParse(product)
        expect(result.success).toBe(false)
      })

      it('should reject empty SKU', () => {
        const product = {
          name: 'Test',
          sku: '',
          price: '1000',
        }

        const result = productSchema.safeParse(product)
        expect(result.success).toBe(false)
      })
    })

    describe('price field', () => {
      it('should accept positive price', () => {
        const product = {
          name: 'Test',
          sku: 'TEST-001',
          price: '1000',
        }

        const result = productSchema.safeParse(product)
        expect(result.success).toBe(true)
      })

      it('should accept zero price', () => {
        const product = {
          name: 'Test',
          sku: 'TEST-001',
          price: '0',
        }

        const result = productSchema.safeParse(product)
        expect(result.success).toBe(true)
      })

      it('should accept decimal price', () => {
        const product = {
          name: 'Test',
          sku: 'TEST-001',
          price: '99.99',
        }

        const result = productSchema.safeParse(product)
        expect(result.success).toBe(true)
      })

      it('should reject negative price', () => {
        const product = {
          name: 'Test',
          sku: 'TEST-001',
          price: '-10',
        }

        const result = productSchema.safeParse(product)
        expect(result.success).toBe(false)
      })

      it('should reject non-numeric price', () => {
        const product = {
          name: 'Test',
          sku: 'TEST-001',
          price: 'invalid',
        }

        const result = productSchema.safeParse(product)
        expect(result.success).toBe(false)
      })
    })

    describe('stock field', () => {
      it('should accept positive stock', () => {
        const product = {
          name: 'Test',
          sku: 'TEST-001',
          price: '1000',
          stock: 100,
        }

        const result = productSchema.safeParse(product)
        expect(result.success).toBe(true)
      })

      it('should accept zero stock', () => {
        const product = {
          name: 'Test',
          sku: 'TEST-001',
          price: '1000',
          stock: 0,
        }

        const result = productSchema.safeParse(product)
        expect(result.success).toBe(true)
      })

      it('should reject negative stock', () => {
        const product = {
          name: 'Test',
          sku: 'TEST-001',
          price: '1000',
          stock: -1,
        }

        const result = productSchema.safeParse(product)
        expect(result.success).toBe(false)
      })

      it('should reject decimal stock', () => {
        const product = {
          name: 'Test',
          sku: 'TEST-001',
          price: '1000',
          stock: 10.5,
        }

        const result = productSchema.safeParse(product)
        expect(result.success).toBe(false)
      })
    })

    describe('description field', () => {
      it('should accept valid description', () => {
        const product = {
          name: 'Test',
          sku: 'TEST-001',
          price: '1000',
          description: 'This is a test product',
        }

        const result = productSchema.safeParse(product)
        expect(result.success).toBe(true)
      })

      it('should accept null description', () => {
        const product = {
          name: 'Test',
          sku: 'TEST-001',
          price: '1000',
          description: null,
        }

        const result = productSchema.safeParse(product)
        expect(result.success).toBe(true)
      })

      it('should reject description longer than 2000 characters', () => {
        const product = {
          name: 'Test',
          sku: 'TEST-001',
          price: '1000',
          description: 'a'.repeat(2001),
        }

        const result = productSchema.safeParse(product)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('stockUpdateSchema', () => {
    it('should validate valid stock update', () => {
      const update = { stock: 50 }

      const result = stockUpdateSchema.safeParse(update)
      expect(result.success).toBe(true)
    })

    it('should accept zero stock', () => {
      const update = { stock: 0 }

      const result = stockUpdateSchema.safeParse(update)
      expect(result.success).toBe(true)
    })

    it('should reject negative stock', () => {
      const update = { stock: -1 }

      const result = stockUpdateSchema.safeParse(update)
      expect(result.success).toBe(false)
    })

    it('should reject decimal stock', () => {
      const update = { stock: 10.5 }

      const result = stockUpdateSchema.safeParse(update)
      expect(result.success).toBe(false)
    })
  })

  describe('productUpdateSchema', () => {
    it('should allow partial updates', () => {
      const update = {
        name: 'Updated Name',
      }

      const result = productUpdateSchema.safeParse(update)
      expect(result.success).toBe(true)
    })

    it('should allow updating multiple fields', () => {
      const update = {
        name: 'Updated Name',
        price: '2000',
        stock: 25,
      }

      const result = productUpdateSchema.safeParse(update)
      expect(result.success).toBe(true)
    })

    it('should still validate field constraints', () => {
      const update = {
        name: '', // empty name should fail
      }

      const result = productUpdateSchema.safeParse(update)
      expect(result.success).toBe(false)
    })
  })
})
