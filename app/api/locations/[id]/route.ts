import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/auth/middleware'

const locationSchema = z.object({
    name: z
        .string()
        .min(1, '場所名は必須です')
        .max(100, '場所名は100文字以内で入力してください'),
})

// GET /api/locations/:id
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
        const location = await prisma.location.findUnique({
            where: { id: params.id },
            include: {
                _count: { select: { products: true } },
            },
        })

        if (!location) {
            return NextResponse.json(
                { error: '場所が見つかりません' },
                { status: 404 }
            )
        }

        return NextResponse.json(location)
    } catch (error) {
        console.error('場所詳細取得エラー:', error)
        return NextResponse.json(
            { error: '場所詳細の取得に失敗しました' },
            { status: 500 }
        )
    }
}

// PUT /api/locations/:id
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
        const validatedData = locationSchema.parse(body)

        const existingLocation = await prisma.location.findUnique({
            where: { id: params.id },
        })

        if (!existingLocation) {
            return NextResponse.json(
                { error: '場所が見つかりません' },
                { status: 404 }
            )
        }

        const duplicateName = await prisma.location.findFirst({
            where: { name: validatedData.name, id: { not: params.id } },
        })

        if (duplicateName) {
            return NextResponse.json(
                { error: 'この場所名は既に使用されています' },
                { status: 409 }
            )
        }

        const location = await prisma.location.update({
            where: { id: params.id },
            data: { name: validatedData.name },
        })

        return NextResponse.json({ success: true, location })
    } catch (error) {
        console.error('場所更新エラー:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'バリデーションエラー', details: error.issues },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: '場所の更新に失敗しました' },
            { status: 500 }
        )
    }
}

// DELETE /api/locations/:id
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

        const existingLocation = await prisma.location.findUnique({
            where: { id: params.id },
        })

        if (!existingLocation) {
            return NextResponse.json(
                { error: '場所が見つかりません' },
                { status: 404 }
            )
        }

        await prisma.location.delete({
            where: { id: params.id },
        })

        return NextResponse.json({ success: true, message: '場所を削除しました' })
    } catch (error) {
        console.error('場所削除エラー:', error)
        return NextResponse.json(
            { error: '場所の削除に失敗しました' },
            { status: 500 }
        )
    }
}
