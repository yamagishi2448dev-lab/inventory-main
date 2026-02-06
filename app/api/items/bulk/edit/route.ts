import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { itemBulkEditSchema } from '@/lib/validations/item'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/auth/middleware'
import { createChangeLog } from '@/lib/changelog'

// POST /api/items/bulk/edit - アイテム一括編集
export async function POST(request: NextRequest) {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const body = await request.json()

    // バリデーション
    const validatedData = itemBulkEditSchema.parse(body)
    const { ids, updates } = validatedData

    // 対象アイテムの取得
    const items = await prisma.item.findMany({
      where: { id: { in: ids } },
    })

    if (items.length === 0) {
      return NextResponse.json(
        { error: '編集対象のアイテムが見つかりません' },
        { status: 404 }
      )
    }

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

    // タグの更新
    if (updates.tagIds !== undefined) {
      // トランザクションで処理
      await prisma.$transaction(async (tx) => {
        // 既存タグを削除
        await tx.itemTag.deleteMany({
          where: { itemId: { in: ids } },
        })

        // 新しいタグを作成
        if (updates.tagIds && updates.tagIds.length > 0) {
          const tagData = ids.flatMap(itemId =>
            updates.tagIds!.map(tagId => ({
              itemId,
              tagId,
            }))
          )
          await tx.itemTag.createMany({
            data: tagData,
            skipDuplicates: true,
          })
        }
      })
    }

    // 個数の更新
    if (updates.quantity) {
      const { mode, value } = updates.quantity

      if (mode === 'set') {
        // 固定値設定
        updateData.quantity = value
      } else if (mode === 'adjust') {
        // 増減モード - 各アイテムごとに更新
        for (const item of items) {
          const newQuantity = Math.max(0, item.quantity + value)
          await prisma.item.update({
            where: { id: item.id },
            data: { quantity: newQuantity },
          })
        }
      }
    }

    // 共通フィールドの一括更新（個数が増減モードでない場合のみ）
    let updatedCount = 0
    if (Object.keys(updateData).length > 0) {
      const result = await prisma.item.updateMany({
        where: { id: { in: ids } },
        data: updateData,
      })
      updatedCount = result.count
    } else if (updates.quantity?.mode === 'adjust') {
      updatedCount = items.length
    } else if (updates.tagIds !== undefined) {
      updatedCount = items.length
    }

    // 変更履歴の記録
    if (auth.user) {
      for (const item of items) {
        await createChangeLog({
          entityType: 'item',
          entityId: item.id,
          entityName: item.name,
          entitySku: item.sku,
          action: 'update',
          userId: auth.user.id,
          userName: auth.user.username,
          itemType: item.itemType,
        })
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `${updatedCount}件のアイテムを更新しました`,
    })
  } catch (error) {
    console.error('アイテム一括編集エラー:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'アイテムの一括編集に失敗しました' },
      { status: 500 }
    )
  }
}
