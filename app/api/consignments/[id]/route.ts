import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { consignmentUpdateSchema } from '@/lib/validations/consignment'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/auth/middleware'
import { createChangeLog, compareChanges, PRODUCT_FIELD_LABELS } from '@/lib/changelog'

// GET /api/consignments/:id - 委託品詳細取得
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
    const consignment = await prisma.consignment.findUnique({
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

    if (!consignment) {
      return NextResponse.json(
        { error: '委託品が見つかりません' },
        { status: 404 }
      )
    }

    // 原価合計を計算して追加
    const formattedConsignment = {
      ...consignment,
      totalCost: consignment.costPrice.mul(consignment.quantity).toString(),
    }

    return NextResponse.json(formattedConsignment)
  } catch (error) {
    console.error('委託品詳細取得エラー:', error)
    return NextResponse.json(
      { error: '委託品詳細の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// PUT /api/consignments/:id - 委託品更新
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
    const validatedData = consignmentUpdateSchema.parse(body)

    // 委託品の存在確認
    const existingConsignment = await prisma.consignment.findUnique({
      where: { id: params.id },
    })

    if (!existingConsignment) {
      return NextResponse.json(
        { error: '委託品が見つかりません' },
        { status: 404 }
      )
    }

    // v2.2追加: タグの更新（既存を削除してから新規作成）
    if (validatedData.tagIds !== undefined) {
      await prisma.consignmentTag.deleteMany({
        where: { consignmentId: params.id },
      })

      if (validatedData.tagIds.length > 0) {
        await prisma.consignmentTag.createMany({
          data: validatedData.tagIds.map((tagId) => ({
            consignmentId: params.id,
            tagId,
          })),
        })
      }
    }

    // 委託品更新（SKUは編集不可、原価は常に0）（v2.2）
    const consignment = await prisma.consignment.update({
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
        // costPrice は更新しない（常に0を維持）
        listPrice: validatedData.listPrice !== undefined ? validatedData.listPrice : undefined,
        arrivalDate: validatedData.arrivalDate !== undefined ? validatedData.arrivalDate : undefined,
        locationId: validatedData.locationId !== undefined ? validatedData.locationId : undefined,
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
    const formattedConsignment = {
      ...consignment,
      totalCost: consignment.costPrice.mul(consignment.quantity).toString(),
    }

    // 変更履歴を記録
    if (auth.user) {
      const changes = compareChanges(
        existingConsignment as Record<string, unknown>,
        consignment as unknown as Record<string, unknown>,
        PRODUCT_FIELD_LABELS
      )
      if (changes.length > 0) {
        await createChangeLog({
          entityType: 'consignment',
          entityId: consignment.id,
          entityName: consignment.name,
          entitySku: consignment.sku,
          action: 'update',
          changes,
          userId: auth.user.id,
          userName: auth.user.username,
        })
      }
    }

    return NextResponse.json({
      success: true,
      consignment: formattedConsignment,
    })
  } catch (error) {
    console.error('委託品更新エラー:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '委託品の更新に失敗しました' },
      { status: 500 }
    )
  }
}

// DELETE /api/consignments/:id - 委託品削除
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
    // 委託品の存在確認
    const existingConsignment = await prisma.consignment.findUnique({
      where: { id: params.id },
    })

    if (!existingConsignment) {
      return NextResponse.json(
        { error: '委託品が見つかりません' },
        { status: 404 }
      )
    }

    // 削除前に変更履歴を記録
    if (auth.user) {
      await createChangeLog({
        entityType: 'consignment',
        entityId: existingConsignment.id,
        entityName: existingConsignment.name,
        entitySku: existingConsignment.sku,
        action: 'delete',
        userId: auth.user.id,
        userName: auth.user.username,
      })
    }

    // 委託品削除（Cascadeで関連する画像も自動削除）
    await prisma.consignment.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: '委託品を削除しました',
    })
  } catch (error) {
    console.error('委託品削除エラー:', error)
    return NextResponse.json(
      { error: '委託品の削除に失敗しました' },
      { status: 500 }
    )
  }
}
