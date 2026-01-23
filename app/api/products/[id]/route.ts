import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { productUpdateSchemaV2 } from '@/lib/validations/product'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/auth/middleware'
import { createChangeLog, compareChanges, PRODUCT_FIELD_LABELS } from '@/lib/changelog'  // v2.1追加
import { deleteFromCloudinary } from '@/lib/cloudinary'

// GET /api/products/:id - 商品詳細取得（v2.0）
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const params = await context.params
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        manufacturer: {
          select: {
            id: true,
            name: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
        images: {
          orderBy: {
            order: 'asc',
          },
          select: {
            id: true,
            url: true,
            order: true,
          },
        },
        materials: {
          orderBy: {
            order: 'asc',
          },
          include: {
            materialType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    // 原価合計を計算して追加
    const formattedProduct = {
      ...product,
      totalCost: product.costPrice.mul(product.quantity).toString(),
    }

    return NextResponse.json(formattedProduct)
  } catch (error) {
    console.error('商品詳細取得エラー:', error)
    return NextResponse.json(
      { error: '商品詳細の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// PUT /api/products/:id - 商品更新（v2.0）
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const params = await context.params
    const body = await request.json()

    // バリデーション（v2.0スキーマ）
    const validatedData = productUpdateSchemaV2.parse(body)

    // 商品の存在確認
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    // v2.2追加: タグの更新（既存を削除してから新規作成）
    if (validatedData.tagIds !== undefined) {
      await prisma.productTag.deleteMany({
        where: { productId: params.id },
      })

      if (validatedData.tagIds.length > 0) {
        await prisma.productTag.createMany({
          data: validatedData.tagIds.map((tagId) => ({
            productId: params.id,
            tagId,
          })),
        })
      }
    }

    // 商品更新（v2.2）- SKUは編集不可
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: validatedData.name,
        manufacturerId: validatedData.manufacturerId !== undefined ? validatedData.manufacturerId : undefined,
        categoryId: validatedData.categoryId !== undefined ? validatedData.categoryId : undefined,
        specification: validatedData.specification !== undefined ? validatedData.specification : undefined,
        size: validatedData.size !== undefined ? validatedData.size : undefined,  // v2.1追加
        fabricColor: validatedData.fabricColor !== undefined ? validatedData.fabricColor : undefined,
        quantity: validatedData.quantity !== undefined ? validatedData.quantity : undefined,
        unitId: validatedData.unitId !== undefined ? validatedData.unitId : undefined,
        costPrice: validatedData.costPrice,
        listPrice: validatedData.listPrice !== undefined ? validatedData.listPrice : undefined,
        arrivalDate: validatedData.arrivalDate !== undefined ? validatedData.arrivalDate : undefined,
        locationId: validatedData.locationId !== undefined ? validatedData.locationId : undefined,
        notes: validatedData.notes !== undefined ? validatedData.notes : undefined,
        isSold: validatedData.isSold !== undefined ? validatedData.isSold : undefined,  // v2.1追加
        soldAt: validatedData.soldAt !== undefined ? (validatedData.soldAt ? new Date(validatedData.soldAt) : null) : undefined,  // v2.1追加
      },
      include: {
        category: true,
        manufacturer: true,
        location: true,
        unit: true,
        images: true,
        materials: {
          orderBy: {
            order: 'asc',
          },
          include: {
            materialType: true,
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    // 原価合計を計算して追加
    const formattedProduct = {
      ...product,
      totalCost: product.costPrice.mul(product.quantity).toString(),
    }

    // v2.1追加: 変更履歴を記録
    if (auth.user) {
      const changes = compareChanges(
        existingProduct as Record<string, unknown>,
        product as unknown as Record<string, unknown>,
        PRODUCT_FIELD_LABELS
      )
      if (changes.length > 0) {
        await createChangeLog({
          entityType: 'product',
          entityId: product.id,
          entityName: product.name,
          entitySku: product.sku,
          action: 'update',
          changes,
          userId: auth.user.id,
          userName: auth.user.username,
        })
      }
    }

    return NextResponse.json({
      success: true,
      product: formattedProduct,
    })
  } catch (error) {
    console.error('商品更新エラー:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '商品の更新に失敗しました' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/:id - 商品削除
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const params = await context.params
    // 商品の存在確認（画像も取得）
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        images: true,
      },
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    // v2.1追加: 削除前に変更履歴を記録
    if (auth.user) {
      await createChangeLog({
        entityType: 'product',
        entityId: existingProduct.id,
        entityName: existingProduct.name,
        entitySku: existingProduct.sku,
        action: 'delete',
        userId: auth.user.id,
        userName: auth.user.username,
      })
    }

    // Cloudinary画像を削除
    for (const image of existingProduct.images) {
      if (image.url.includes('cloudinary.com')) {
        try {
          await deleteFromCloudinary(image.url)
        } catch (err) {
          console.error('Cloudinary画像の削除に失敗しました:', err)
        }
      }
    }

    // 商品削除（Cascadeで関連するDB画像レコードも自動削除）
    await prisma.product.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: '商品を削除しました',
    })
  } catch (error) {
    console.error('商品削除エラー:', error)
    return NextResponse.json(
      { error: '商品の削除に失敗しました' },
      { status: 500 }
    )
  }
}
