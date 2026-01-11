import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '@/lib/db/prisma'
import { hashPassword } from '@/lib/auth/password'

describe('Products API Integration Tests', () => {
  let testUserId: string
  let testCategoryId: string
  let testSupplierId: string
  let testTagId: string

  beforeAll(async () => {
    // Create test user
    const hashedPassword = await hashPassword('testpassword')
    const user = await prisma.user.create({
      data: {
        username: 'testuser_products',
        passwordHash: hashedPassword,
        role: 'ADMIN',
      },
    })
    testUserId = user.id

    // Create test category
    const category = await prisma.category.create({
      data: {
        name: 'Test Category for Products',
        description: 'Integration test category',
      },
    })
    testCategoryId = category.id

    // Create test supplier
    const supplier = await prisma.supplier.create({
      data: {
        name: 'Test Supplier for Products',
        contactName: 'Test Contact',
        email: 'test@supplier.com',
      },
    })
    testSupplierId = supplier.id

    // Create test tag
    const tag = await prisma.tag.create({
      data: {
        name: 'Test Tag for Products',
      },
    })
    testTagId = tag.id
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.productTag.deleteMany({
      where: {
        tag: {
          name: { contains: 'Test Tag' },
        },
      },
    })

    await prisma.productImage.deleteMany({
      where: {
        product: {
          sku: { contains: 'TEST-' },
        },
      },
    })

    await prisma.product.deleteMany({
      where: {
        sku: { contains: 'TEST-' },
      },
    })

    await prisma.tag.deleteMany({
      where: {
        name: { contains: 'Test Tag' },
      },
    })

    await prisma.category.deleteMany({
      where: {
        name: { contains: 'Test Category' },
      },
    })

    await prisma.supplier.deleteMany({
      where: {
        name: { contains: 'Test Supplier' },
      },
    })

    await prisma.session.deleteMany({
      where: {
        userId: testUserId,
      },
    })

    await prisma.user.deleteMany({
      where: {
        username: { contains: 'testuser_products' },
      },
    })

    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up products before each test
    await prisma.productTag.deleteMany({
      where: {
        product: {
          sku: { contains: 'TEST-' },
        },
      },
    })

    await prisma.productImage.deleteMany({
      where: {
        product: {
          sku: { contains: 'TEST-' },
        },
      },
    })

    await prisma.product.deleteMany({
      where: {
        sku: { contains: 'TEST-' },
      },
    })
  })

  describe('Product Creation', () => {
    it('should create a product with minimal data', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Test Product 1',
          sku: 'TEST-001',
          price: 1000,
          stock: 10,
        },
      })

      expect(product).toBeDefined()
      expect(product.name).toBe('Test Product 1')
      expect(product.sku).toBe('TEST-001')
      expect(product.price.toNumber()).toBe(1000)
      expect(product.stock).toBe(10)
    })

    it('should create a product with category and supplier', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Test Product 2',
          sku: 'TEST-002',
          price: 2000,
          stock: 20,
          categoryId: testCategoryId,
          supplierId: testSupplierId,
        },
        include: {
          category: true,
          supplier: true,
        },
      })

      expect(product.category).toBeDefined()
      expect(product.category?.name).toBe('Test Category for Products')
      expect(product.supplier).toBeDefined()
      expect(product.supplier?.name).toBe('Test Supplier for Products')
    })

    it('should create a product with tags', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Test Product 3',
          sku: 'TEST-003',
          price: 3000,
          stock: 30,
          tags: {
            create: [{ tagId: testTagId }],
          },
        },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      })

      expect(product.tags).toHaveLength(1)
      expect(product.tags[0].tag.name).toBe('Test Tag for Products')
    })

    it('should create a product with images', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Test Product 4',
          sku: 'TEST-004',
          price: 4000,
          stock: 40,
          images: {
            create: [
              { url: '/uploads/test1.jpg', order: 0 },
              { url: '/uploads/test2.jpg', order: 1 },
            ],
          },
        },
        include: {
          images: true,
        },
      })

      expect(product.images).toHaveLength(2)
      expect(product.images[0].url).toBe('/uploads/test1.jpg')
      expect(product.images[1].url).toBe('/uploads/test2.jpg')
    })

    it('should not create a product with duplicate SKU', async () => {
      await prisma.product.create({
        data: {
          name: 'Test Product 5',
          sku: 'TEST-DUP',
          price: 5000,
          stock: 50,
        },
      })

      await expect(
        prisma.product.create({
          data: {
            name: 'Test Product 6',
            sku: 'TEST-DUP',
            price: 6000,
            stock: 60,
          },
        })
      ).rejects.toThrow()
    })
  })

  describe('Product Retrieval', () => {
    beforeEach(async () => {
      // Create test products
      await prisma.product.createMany({
        data: [
          { name: 'Test Product A', sku: 'TEST-A', price: 1000, stock: 10 },
          { name: 'Test Product B', sku: 'TEST-B', price: 2000, stock: 20 },
          { name: 'Test Product C', sku: 'TEST-C', price: 3000, stock: 0 },
        ],
      })
    })

    it('should retrieve all products', async () => {
      const products = await prisma.product.findMany({
        where: {
          sku: { contains: 'TEST-' },
        },
      })

      expect(products.length).toBeGreaterThanOrEqual(3)
    })

    it('should retrieve a product by id', async () => {
      const created = await prisma.product.findFirst({
        where: { sku: 'TEST-A' },
      })

      const product = await prisma.product.findUnique({
        where: { id: created!.id },
      })

      expect(product).toBeDefined()
      expect(product?.name).toBe('Test Product A')
    })

    it('should retrieve a product by SKU', async () => {
      const product = await prisma.product.findUnique({
        where: { sku: 'TEST-A' },
      })

      expect(product).toBeDefined()
      expect(product?.name).toBe('Test Product A')
    })

    it('should filter products by stock availability', async () => {
      const inStock = await prisma.product.findMany({
        where: {
          sku: { contains: 'TEST-' },
          stock: { gt: 0 },
        },
      })

      const outOfStock = await prisma.product.findMany({
        where: {
          sku: { contains: 'TEST-' },
          stock: { equals: 0 },
        },
      })

      expect(inStock.length).toBeGreaterThanOrEqual(2)
      expect(outOfStock.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Product Update', () => {
    it('should update product name and price', async () => {
      const created = await prisma.product.create({
        data: {
          name: 'Test Product Update 1',
          sku: 'TEST-UPD-1',
          price: 1000,
          stock: 10,
        },
      })

      const updated = await prisma.product.update({
        where: { id: created.id },
        data: {
          name: 'Updated Product Name',
          price: 1500,
        },
      })

      expect(updated.name).toBe('Updated Product Name')
      expect(updated.price.toNumber()).toBe(1500)
      expect(updated.sku).toBe('TEST-UPD-1') // SKU should remain unchanged
    })

    it('should update product stock', async () => {
      const created = await prisma.product.create({
        data: {
          name: 'Test Product Update 2',
          sku: 'TEST-UPD-2',
          price: 2000,
          stock: 20,
        },
      })

      const updated = await prisma.product.update({
        where: { id: created.id },
        data: {
          stock: 50,
        },
      })

      expect(updated.stock).toBe(50)
    })

    it('should update product category', async () => {
      const created = await prisma.product.create({
        data: {
          name: 'Test Product Update 3',
          sku: 'TEST-UPD-3',
          price: 3000,
          stock: 30,
        },
      })

      const updated = await prisma.product.update({
        where: { id: created.id },
        data: {
          categoryId: testCategoryId,
        },
        include: {
          category: true,
        },
      })

      expect(updated.category).toBeDefined()
      expect(updated.category?.name).toBe('Test Category for Products')
    })
  })

  describe('Product Deletion', () => {
    it('should delete a product', async () => {
      const created = await prisma.product.create({
        data: {
          name: 'Test Product Delete 1',
          sku: 'TEST-DEL-1',
          price: 1000,
          stock: 10,
        },
      })

      await prisma.product.delete({
        where: { id: created.id },
      })

      const deleted = await prisma.product.findUnique({
        where: { id: created.id },
      })

      expect(deleted).toBeNull()
    })

    it('should cascade delete product images', async () => {
      const created = await prisma.product.create({
        data: {
          name: 'Test Product Delete 2',
          sku: 'TEST-DEL-2',
          price: 2000,
          stock: 20,
          images: {
            create: [{ url: '/uploads/delete-test.jpg', order: 0 }],
          },
        },
        include: {
          images: true,
        },
      })

      const imageId = created.images[0].id

      await prisma.product.delete({
        where: { id: created.id },
      })

      const deletedImage = await prisma.productImage.findUnique({
        where: { id: imageId },
      })

      expect(deletedImage).toBeNull()
    })

    it('should cascade delete product tags', async () => {
      const created = await prisma.product.create({
        data: {
          name: 'Test Product Delete 3',
          sku: 'TEST-DEL-3',
          price: 3000,
          stock: 30,
          tags: {
            create: [{ tagId: testTagId }],
          },
        },
      })

      await prisma.product.delete({
        where: { id: created.id },
      })

      const productTags = await prisma.productTag.findMany({
        where: { productId: created.id },
      })

      expect(productTags).toHaveLength(0)
    })
  })

  describe('Product Search and Filtering', () => {
    beforeEach(async () => {
      // Create products with category
      const productA = await prisma.product.create({
        data: {
          name: 'Apple Product',
          sku: 'TEST-SEARCH-A',
          price: 1000,
          stock: 10,
          categoryId: testCategoryId,
        },
      })

      await prisma.product.create({
        data: {
          name: 'Banana Product',
          sku: 'TEST-SEARCH-B',
          price: 2000,
          stock: 20,
        },
      })

      await prisma.product.create({
        data: {
          name: 'Apple Pie',
          sku: 'TEST-SEARCH-C',
          price: 3000,
          stock: 0,
          tags: {
            create: [{ tagId: testTagId }],
          },
        },
      })
    })

    it('should search products by name', async () => {
      const results = await prisma.product.findMany({
        where: {
          sku: { contains: 'TEST-SEARCH-' },
          name: { contains: 'Apple' },
        },
      })

      expect(results.length).toBe(2)
      expect(results.every((p) => p.name.includes('Apple'))).toBe(true)
    })

    it('should filter products by category', async () => {
      const results = await prisma.product.findMany({
        where: {
          sku: { contains: 'TEST-SEARCH-' },
          categoryId: testCategoryId,
        },
      })

      expect(results.length).toBeGreaterThanOrEqual(1)
    })

    it('should filter products by tag', async () => {
      const results = await prisma.product.findMany({
        where: {
          sku: { contains: 'TEST-SEARCH-' },
          tags: {
            some: {
              tagId: testTagId,
            },
          },
        },
      })

      expect(results.length).toBeGreaterThanOrEqual(1)
    })

    it('should filter products by stock status', async () => {
      const inStock = await prisma.product.findMany({
        where: {
          sku: { contains: 'TEST-SEARCH-' },
          stock: { gt: 0 },
        },
      })

      const outOfStock = await prisma.product.findMany({
        where: {
          sku: { contains: 'TEST-SEARCH-' },
          stock: 0,
        },
      })

      expect(inStock.length).toBeGreaterThanOrEqual(2)
      expect(outOfStock.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Product Pagination', () => {
    beforeEach(async () => {
      // Create 25 test products for pagination
      const products = Array.from({ length: 25 }, (_, i) => ({
        name: `Test Product ${i + 1}`,
        sku: `TEST-PAGE-${String(i + 1).padStart(3, '0')}`,
        price: (i + 1) * 100,
        stock: i + 1,
      }))

      await prisma.product.createMany({
        data: products,
      })
    })

    it('should paginate products', async () => {
      const page1 = await prisma.product.findMany({
        where: { sku: { contains: 'TEST-PAGE-' } },
        take: 10,
        skip: 0,
        orderBy: { sku: 'asc' },
      })

      const page2 = await prisma.product.findMany({
        where: { sku: { contains: 'TEST-PAGE-' } },
        take: 10,
        skip: 10,
        orderBy: { sku: 'asc' },
      })

      expect(page1).toHaveLength(10)
      expect(page2).toHaveLength(10)
      expect(page1[0].sku).not.toBe(page2[0].sku)
    })

    it('should count total products for pagination', async () => {
      const total = await prisma.product.count({
        where: { sku: { contains: 'TEST-PAGE-' } },
      })

      expect(total).toBe(25)
    })
  })
})
