/**
 * 商品一括削除API
 * POST /api/products/bulk/delete
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'
import { BulkDeleteRequest, BulkDeleteResponse } from '@/lib/types'

// バリデーションスキーマ
const bulkDeleteSchema = z.object({
    productIds: z
        .array(z.string().cuid('Invalid product ID format'))
        .min(1, 'At least one product ID is required')
        .max(100, 'Maximum 100 products can be deleted at once'),
})

export async function POST(request: NextRequest) {
    // 認証チェック
    const auth = await authenticateRequest()
    if (!auth.success) {
        return auth.response
    }

    try {

        // リクエストボディの取得とバリデーション
        const body = (await request.json()) as BulkDeleteRequest

        const validationResult = bulkDeleteSchema.safeParse(body)
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: 'バリデーションエラー',
                    details: validationResult.error.issues,
                },
                { status: 400 }
            )
        }

        const { productIds } = validationResult.data

        // 一括削除実行（関連画像も自動削除される: Cascade設定済み）
        const result = await prisma.product.deleteMany({
            where: {
                id: {
                    in: productIds,
                },
            },
        })

        const response: BulkDeleteResponse = {
            success: true,
            deletedCount: result.count,
            message: `${result.count}件の商品を削除しました`,
        }

        return NextResponse.json(response, {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
            },
        })
    } catch (error) {
        console.error('Bulk delete error:', error)
        return NextResponse.json(
            { error: '一括削除に失敗しました' },
            { status: 500 }
        )
    }
}
