import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'
import { z } from 'zod'
import { createChangeLog } from '@/lib/changelog'

// 一括削除リクエストのスキーマ
const bulkDeleteSchema = z.object({
  consignmentIds: z.array(z.string().cuid()).min(1, '1件以上の委託品を選択してください'),
})

// 一括編集リクエストのスキーマ
const bulkEditSchema = z.object({
  consignmentIds: z.array(z.string().cuid()).min(1, '1件以上の委託品を選択してください'),
  updates: z.object({
    locationId: z.string().cuid().optional(),
    manufacturerId: z.string().cuid().optional(),
    categoryId: z.string().cuid().optional(),
    quantity: z.object({
      mode: z.enum(['set', 'increment']),
      value: z.number().int(),
    }).optional(),
  }),
})

// DELETE /api/consignments/bulk - 委託品一括削除
export async function DELETE(request: NextRequest) {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const body = await request.json()
    const { consignmentIds } = bulkDeleteSchema.parse(body)

    // 削除前に委託品情報を取得（変更履歴用）
    const consignmentsToDelete = await prisma.consignment.findMany({
      where: { id: { in: consignmentIds } },
      select: { id: true, name: true, sku: true },
    })

    // 一括削除実行
    const result = await prisma.consignment.deleteMany({
      where: {
        id: { in: consignmentIds },
      },
    })

    // 変更履歴を記録
    if (auth.user) {
      for (const consignment of consignmentsToDelete) {
        await createChangeLog({
          entityType: 'consignment',
          entityId: consignment.id,
          entityName: consignment.name,
          entitySku: consignment.sku,
          action: 'delete',
          userId: auth.user.id,
          userName: auth.user.username,
        })
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `${result.count}件の委託品を削除しました`,
    })
  } catch (error) {
    console.error('委託品一括削除エラー:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '委託品の一括削除に失敗しました' },
      { status: 500 }
    )
  }
}

// PATCH /api/consignments/bulk - 委託品一括編集
export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const body = await request.json()
    const { consignmentIds, updates } = bulkEditSchema.parse(body)

    // 更新データの構築
    const updateData: Record<string, unknown> = {}

    if (updates.locationId !== undefined) {
      updateData.locationId = updates.locationId
    }

    if (updates.manufacturerId !== undefined) {
      updateData.manufacturerId = updates.manufacturerId
    }

    if (updates.categoryId !== undefined) {
      updateData.categoryId = updates.categoryId
    }

    // 個数の更新処理
    if (updates.quantity) {
      if (updates.quantity.mode === 'set') {
        // 固定値に設定
        updateData.quantity = updates.quantity.value
      } else if (updates.quantity.mode === 'increment') {
        // 増減値を適用（各レコードに対して個別に更新）
        const consignments = await prisma.consignment.findMany({
          where: { id: { in: consignmentIds } },
          select: { id: true, quantity: true },
        })

        for (const consignment of consignments) {
          const newQuantity = Math.max(0, consignment.quantity + updates.quantity.value)
          await prisma.consignment.update({
            where: { id: consignment.id },
            data: { quantity: newQuantity },
          })
        }

        // 個数の増減処理を行った場合は、他の更新がなければ完了
        if (Object.keys(updateData).length === 0) {
          return NextResponse.json({
            success: true,
            updatedCount: consignments.length,
            message: `${consignments.length}件の委託品を更新しました`,
          })
        }
      }
    }

    // 一括更新実行
    let result = { count: 0 }
    if (Object.keys(updateData).length > 0) {
      result = await prisma.consignment.updateMany({
        where: { id: { in: consignmentIds } },
        data: updateData,
      })
    }

    return NextResponse.json({
      success: true,
      updatedCount: result.count || consignmentIds.length,
      message: `${result.count || consignmentIds.length}件の委託品を更新しました`,
    })
  } catch (error) {
    console.error('委託品一括編集エラー:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '委託品の一括編集に失敗しました' },
      { status: 500 }
    )
  }
}
