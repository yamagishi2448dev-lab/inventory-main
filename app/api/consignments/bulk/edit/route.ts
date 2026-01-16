/**
 * 委託品一括編集API
 * POST /api/consignments/bulk/edit
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'

// バリデーションスキーマ
const bulkEditSchema = z.object({
    consignmentIds: z
        .array(z.string().cuid('Invalid consignment ID format'))
        .min(1, 'At least one consignment ID is required')
        .max(100, 'Maximum 100 consignments can be edited at once'),
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
        const body = await request.json()

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

        const { consignmentIds, updates } = validationResult.data

        let updatedCount = 0

        // タグの更新処理（トランザクションで実行）
        if (updates.tagIds !== undefined) {
            await prisma.$transaction(async (tx) => {
                // 既存のタグ関連付けを削除
                await tx.consignmentTag.deleteMany({
                    where: {
                        consignmentId: { in: consignmentIds },
                    },
                })

                // 新しいタグを関連付け
                if (updates.tagIds!.length > 0) {
                    await tx.consignmentTag.createMany({
                        data: consignmentIds.flatMap((consignmentId) =>
                            updates.tagIds!.map((tagId) => ({
                                consignmentId,
                                tagId,
                            }))
                        ),
                    })
                }
            })
        }

        // 個数の増減モードの場合は個別更新
        if (updates.quantity && updates.quantity.mode === 'increment') {
            const consignments = await prisma.consignment.findMany({
                where: { id: { in: consignmentIds } },
                select: { id: true, quantity: true },
            })

            // トランザクションで個別更新
            await prisma.$transaction(
                consignments.map((consignment) => {
                    const newQuantity = consignment.quantity + updates.quantity!.value
                    // 個数が負にならないようにチェック
                    if (newQuantity < 0) {
                        throw new Error(
                            `委託品ID ${consignment.id} の個数が負になります（現在: ${consignment.quantity}）`
                        )
                    }
                    return prisma.consignment.update({
                        where: { id: consignment.id },
                        data: { quantity: newQuantity },
                    })
                })
            )
            updatedCount = consignments.length
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

            const result = await prisma.consignment.updateMany({
                where: {
                    id: { in: consignmentIds },
                },
                data: updateData,
            })

            updatedCount = result.count
        }

        return NextResponse.json(
            {
                success: true,
                updatedCount,
                message: `${updatedCount}件の委託品を更新しました`,
            },
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                },
            }
        )
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
