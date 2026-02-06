import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { itemUpdateSchema } from '@/lib/validations/item'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/auth/middleware'
import { createChangeLog, compareChanges, PRODUCT_FIELD_LABELS } from '@/lib/changelog'
import { deleteFromCloudinary } from '@/lib/cloudinary'
import { calculateTotalCost } from '@/lib/items/query'

// GET /api/items/:id - アイテム詳細取得
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
    const item = await prisma.item.findUnique({
      where: { id: params.id },
      include: {
        category: {
          select: { id: true, name: true },
        },
        manufacturer: {
          select: { id: true, name: true },
        },
        location: {
          select: { id: true, name: true },
        },
        unit: {
          select: { id: true, name: true },
        },
        images: {
          orderBy: { order: 'asc' },
          select: { id: true, url: true, order: true },
        },
        materials: {
          orderBy: { order: 'asc' },
          include: {
            materialType: {
              select: { id: true, name: true },
            },
          },
        },
        tags: {
          include: {
            tag: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    if (!item) {
      return NextResponse.json(
        { error: 'アイテムが見つかりません' },
        { status: 404 }
      )
    }

    // 原価合計を計算して追加
    const formattedItem = {
      ...item,
      totalCost: calculateTotalCost(item),
    }

    return NextResponse.json(formattedItem)
  } catch (error) {
    console.error('アイテム詳細取得エラー:', error)
    return NextResponse.json(
      { error: 'アイテム詳細の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// PUT /api/items/:id - アイテム更新
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

    // バリデーション
    const validatedData = itemUpdateSchema.parse(body)

    // アイテムの存在確認
    const existingItem = await prisma.item.findUnique({
      where: { id: params.id },
    })

    if (!existingItem) {
      return NextResponse.json(
        { error: 'アイテムが見つかりません' },
        { status: 404 }
      )
    }

    // 商品の場合、costPriceがnullに変更されないことを確認
    if (existingItem.itemType === 'PRODUCT' && validatedData.costPrice === null) {
      return NextResponse.json(
        { error: '商品の原価単価は必須です' },
        { status: 400 }
      )
    }

    // タグの更新（既存を削除してから新規作成）
    if (validatedData.tagIds !== undefined) {
      await prisma.itemTag.deleteMany({
        where: { itemId: params.id },
      })

      if (validatedData.tagIds.length > 0) {
        await prisma.itemTag.createMany({
          data: validatedData.tagIds.map((tagId) => ({
            itemId: params.id,
            tagId,
          })),
        })
      }
    }

    // 画像の更新（既存を削除してから新規作成）
    if (validatedData.images !== undefined) {
      // 既存の画像を取得
      const existingImages = await prisma.itemImage.findMany({
        where: { itemId: params.id },
      })

      // 既存の画像をCloudinaryから削除
      for (const image of existingImages) {
        try {
          await deleteFromCloudinary(image.url)
        } catch (error) {
          console.error('Cloudinary画像削除エラー:', error)
        }
      }

      // 既存の画像をDBから削除
      await prisma.itemImage.deleteMany({
        where: { itemId: params.id },
      })

      // 新しい画像を作成
      if (validatedData.images.length > 0) {
        await prisma.itemImage.createMany({
          data: validatedData.images.map((image) => ({
            itemId: params.id,
            url: image.url,
            order: image.order,
          })),
        })
      }
    }

    // アイテム更新（SKUとitemTypeは編集不可）
    const item = await prisma.item.update({
      where: { id: params.id },
      data: {
        name: validatedData.name,
        manufacturerId: validatedData.manufacturerId !== undefined ? validatedData.manufacturerId : undefined,
        categoryId: validatedData.categoryId !== undefined ? validatedData.categoryId : undefined,
        specification: validatedData.specification !== undefined ? validatedData.specification : undefined,
        size: validatedData.size !== undefined ? validatedData.size : undefined,
        fabricColor: validatedData.fabricColor !== undefined ? validatedData.fabricColor : undefined,
        quantity: validatedData.quantity !== undefined ? validatedData.quantity : undefined,
        unitId: validatedData.unitId !== undefined ? validatedData.unitId : undefined,
        costPrice: validatedData.costPrice !== undefined ? validatedData.costPrice : undefined,
        listPrice: validatedData.listPrice !== undefined ? validatedData.listPrice : undefined,
        arrivalDate: validatedData.arrivalDate !== undefined ? validatedData.arrivalDate : undefined,
        locationId: validatedData.locationId !== undefined ? validatedData.locationId : undefined,
        designer: validatedData.designer !== undefined ? validatedData.designer : undefined,
        notes: validatedData.notes !== undefined ? validatedData.notes : undefined,
        isSold: validatedData.isSold !== undefined ? validatedData.isSold : undefined,
        soldAt: validatedData.soldAt !== undefined ? (validatedData.soldAt ? new Date(validatedData.soldAt) : null) : undefined,
      },
      include: {
        category: true,
        manufacturer: true,
        location: true,
        unit: true,
        images: true,
        materials: {
          orderBy: { order: 'asc' },
          include: { materialType: true },
        },
        tags: {
          include: {
            tag: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    // 原価合計を計算して追加
    const formattedItem = {
      ...item,
      totalCost: calculateTotalCost(item),
    }

    // 変更履歴を記録
    if (auth.user) {
      const changes = compareChanges(
        existingItem as Record<string, unknown>,
        item as unknown as Record<string, unknown>,
        PRODUCT_FIELD_LABELS
      )
      if (changes.length > 0) {
        await createChangeLog({
          entityType: 'item',
          entityId: item.id,
          entityName: item.name,
          entitySku: item.sku,
          action: 'update',
          changes,
          userId: auth.user.id,
          userName: auth.user.username,
          itemType: item.itemType,
        })
      }
    }

    return NextResponse.json({
      success: true,
      item: formattedItem,
    })
  } catch (error) {
    console.error('アイテム更新エラー:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'アイテムの更新に失敗しました' },
      { status: 500 }
    )
  }
}

// DELETE /api/items/:id - アイテム削除
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
    // アイテムの存在確認（画像も取得）
    const existingItem = await prisma.item.findUnique({
      where: { id: params.id },
      include: { images: true },
    })

    if (!existingItem) {
      return NextResponse.json(
        { error: 'アイテムが見つかりません' },
        { status: 404 }
      )
    }

    // 削除前に変更履歴を記録
    if (auth.user) {
      await createChangeLog({
        entityType: 'item',
        entityId: existingItem.id,
        entityName: existingItem.name,
        entitySku: existingItem.sku,
        action: 'delete',
        userId: auth.user.id,
        userName: auth.user.username,
        itemType: existingItem.itemType,
      })
    }

    // Cloudinary画像を削除
    for (const image of existingItem.images) {
      if (image.url.includes('cloudinary.com')) {
        try {
          await deleteFromCloudinary(image.url)
        } catch (err) {
          console.error('Cloudinary画像の削除に失敗しました:', err)
        }
      }
    }

    // アイテム削除（Cascadeで関連するDB画像レコードも自動削除）
    await prisma.item.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: 'アイテムを削除しました',
    })
  } catch (error) {
    console.error('アイテム削除エラー:', error)
    return NextResponse.json(
      { error: 'アイテムの削除に失敗しました' },
      { status: 500 }
    )
  }
}
