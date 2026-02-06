import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { itemBulkDeleteSchema } from '@/lib/validations/item'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/auth/middleware'
import { createChangeLog } from '@/lib/changelog'
import { deleteFromCloudinary } from '@/lib/cloudinary'

// POST /api/items/bulk/delete - アイテム一括削除
export async function POST(request: NextRequest) {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const body = await request.json()

    // バリデーション
    const validatedData = itemBulkDeleteSchema.parse(body)
    const { ids } = validatedData

    // 対象アイテムの取得（画像も含む）
    const items = await prisma.item.findMany({
      where: { id: { in: ids } },
      include: { images: true },
    })

    if (items.length === 0) {
      return NextResponse.json(
        { error: '削除対象のアイテムが見つかりません' },
        { status: 404 }
      )
    }

    // 変更履歴の記録
    if (auth.user) {
      for (const item of items) {
        await createChangeLog({
          entityType: 'item',
          entityId: item.id,
          entityName: item.name,
          entitySku: item.sku,
          action: 'delete',
          userId: auth.user.id,
          userName: auth.user.username,
          itemType: item.itemType,
        })
      }
    }

    // Cloudinary画像の削除
    for (const item of items) {
      for (const image of item.images) {
        if (image.url.includes('cloudinary.com')) {
          try {
            await deleteFromCloudinary(image.url)
          } catch (err) {
            console.error('Cloudinary画像の削除に失敗しました:', err)
          }
        }
      }
    }

    // 一括削除
    const result = await prisma.item.deleteMany({
      where: { id: { in: ids } },
    })

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `${result.count}件のアイテムを削除しました`,
    })
  } catch (error) {
    console.error('アイテム一括削除エラー:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'アイテムの一括削除に失敗しました' },
      { status: 500 }
    )
  }
}
