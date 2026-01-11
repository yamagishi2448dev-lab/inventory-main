import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/auth/middleware'

// メーカーバリデーションスキーマ (v2.0)
const manufacturerSchema = z.object({
    name: z
        .string()
        .min(1, 'メーカー名は必須です')
        .max(200, 'メーカー名は200文字以内で入力してください'),
})

// GET /api/manufacturers/:id - メーカー詳細取得
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await authenticateRequest()
    if (!auth.success) {
        return auth.response
    }

    try {
        const params = await context.params
        const manufacturer = await prisma.manufacturer.findUnique({
            where: { id: params.id },
            include: {
                _count: {
                    select: { products: true },
                },
            },
        })

        if (!manufacturer) {
            return NextResponse.json(
                { error: 'メーカーが見つかりません' },
                { status: 404 }
            )
        }

        return NextResponse.json(manufacturer)
    } catch (error) {
        console.error('メーカー詳細取得エラー:', error)
        return NextResponse.json(
            { error: 'メーカー詳細の取得に失敗しました' },
            { status: 500 }
        )
    }
}

// PUT /api/manufacturers/:id - メーカー更新
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await authenticateRequest()
    if (!auth.success) {
        return auth.response
    }

    try {
        const params = await context.params
        const body = await request.json()

        const validatedData = manufacturerSchema.parse(body)

        const existingManufacturer = await prisma.manufacturer.findUnique({
            where: { id: params.id },
        })

        if (!existingManufacturer) {
            return NextResponse.json(
                { error: 'メーカーが見つかりません' },
                { status: 404 }
            )
        }

        // メーカー名の重複チェック
        const duplicateName = await prisma.manufacturer.findFirst({
            where: {
                name: validatedData.name,
                id: { not: params.id },
            },
        })

        if (duplicateName) {
            return NextResponse.json(
                { error: 'このメーカー名は既に使用されています' },
                { status: 409 }
            )
        }

        const manufacturer = await prisma.manufacturer.update({
            where: { id: params.id },
            data: {
                name: validatedData.name,
            },
        })

        return NextResponse.json({
            success: true,
            manufacturer,
        })
    } catch (error) {
        console.error('メーカー更新エラー:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'バリデーションエラー', details: error.issues },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'メーカーの更新に失敗しました' },
            { status: 500 }
        )
    }
}

// DELETE /api/manufacturers/:id - メーカー削除
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await authenticateRequest()
    if (!auth.success) {
        return auth.response
    }

    try {
        const params = await context.params

        const existingManufacturer = await prisma.manufacturer.findUnique({
            where: { id: params.id },
        })

        if (!existingManufacturer) {
            return NextResponse.json(
                { error: 'メーカーが見つかりません' },
                { status: 404 }
            )
        }

        await prisma.manufacturer.delete({
            where: { id: params.id },
        })

        return NextResponse.json({
            success: true,
            message: 'メーカーを削除しました',
        })
    } catch (error) {
        console.error('メーカー削除エラー:', error)
        return NextResponse.json(
            { error: 'メーカーの削除に失敗しました' },
            { status: 500 }
        )
    }
}
