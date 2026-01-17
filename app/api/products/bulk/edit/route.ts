/**
 * 商品一括編集API
 * POST /api/products/bulk/edit
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth/middleware'
import { BulkEditRequest, BulkEditResponse } from '@/lib/types'

// バリデーションスキーマ
const bulkEditSchema = z.object({
    productIds: z
        .array(z.string().cuid('Invalid product ID format'))
        .min(1, 'At least one product ID is required')
        .max(100, 'Maximum 100 products can be edited at once'),
    updates: z
        .object({
            locationId: z.string().cuid().optional(),
            manufacturerId: z.string().cuid().optional(),
            categoryId: z.string().cuid().optional(),
            tagIds: z.array(z.string().cuid()).optional(),
            quantity: z
                .object({
                    mode: z.enum(['set', 'increment']),
                    value: z.number().int(),
                })
                .optional(),
        })
        .refine((data) => {
            // 少なくとも1つのフィールドが指定されていることを確認
            return (
                data.locationId !== undefined ||
                data.manufacturerId !== undefined ||
                data.categoryId !== undefined ||
                data.tagIds !== undefined ||
                data.quantity !== undefined
            )
        }, 'At least one field must be updated'),
})

export async function POST(request: NextRequest) {
    // 認証チェック
    const auth = await authenticateRequest()
    if (!auth.success) {
        return auth.response
    }

    try {

        // リクエストボディの取得とバリデーション
        const body = (await request.json()) as BulkEditRequest

        const validationResult = bulkEditSchema.safeParse(body)
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: 'バリデーションエラー',
                    details: validationResult.error.issues,
                },
                { status: 400 }
            )
        }

        const { productIds, updates } = validationResult.data

        let updatedCount = 0

        // タグの更新処理（トランザクションで実行）
        if (updates.tagIds !== undefined) {
            await prisma.$transaction(async (tx) => {
                // 既存のタグ関連付けを削除
                await tx.productTag.deleteMany({
                    where: {
                        productId: { in: productIds },
                    },
                })

                // 新しいタグを関連付け
                if (updates.tagIds!.length > 0) {
                    await tx.productTag.createMany({
                        data: productIds.flatMap((productId) =>
                            updates.tagIds!.map((tagId) => ({
                                productId,
                                tagId,
                            }))
                        ),
                    })
                }
            })
        }

        // 個数の増減モードの場合はバッチ更新（最適化）
        if (updates.quantity && updates.quantity.mode === 'increment') {
            const incrementValue = updates.quantity.value

            // 負の数になる商品がないかチェック
            if (incrementValue < 0) {
                const invalidProducts = await prisma.product.findMany({
                    where: {
                        id: { in: productIds },
                        quantity: { lt: Math.abs(incrementValue) }
                    },
                    select: { id: true, quantity: true }
                })

                if (invalidProducts.length > 0) {
                    throw new Error(
                        `一部の商品の個数が負になります（対象: ${invalidProducts.length}件）`
                    )
                }
            }

            // バッチUPDATEで一括更新
            const result = await prisma.$executeRaw`
                UPDATE products
                SET quantity = quantity + ${incrementValue}
                WHERE id IN (${Prisma.join(productIds)})
            `
            updatedCount = Number(result)
        } else {
            // 通常の一括更新（個数設定モード含む）
            const updateData: Record<string, string | number | null> = {}

            if (updates.locationId !== undefined) {
                updateData.locationId = updates.locationId
            }
            if (updates.manufacturerId !== undefined) {
                updateData.manufacturerId = updates.manufacturerId
            }
            if (updates.categoryId !== undefined) {
                updateData.categoryId = updates.categoryId
            }
            if (updates.quantity && updates.quantity.mode === 'set') {
                updateData.quantity = updates.quantity.value
            }

            const result = await prisma.product.updateMany({
                where: {
                    id: { in: productIds },
                },
                data: updateData,
            })

            updatedCount = result.count
        }

        const response: BulkEditResponse = {
            success: true,
            updatedCount,
            message: `${updatedCount}件の商品を更新しました`,
        }

        return NextResponse.json(response, {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
            },
        })
    } catch (error) {
        console.error('Bulk edit error:', error)
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : '一括編集に失敗しました',
            },
            { status: 500 }
        )
    }
}
