import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/auth/middleware'

const unitSchema = z.object({
    name: z
        .string()
        .min(1, '単位名は必須です')
        .max(50, '単位名は50文字以内で入力してください'),
})

// GET /api/units/:id
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
        const unit = await prisma.unit.findUnique({
            where: { id: params.id },
            include: { _count: { select: { products: true } } },
        })

        if (!unit) {
            return NextResponse.json({ error: '単位が見つかりません' }, { status: 404 })
        }

        return NextResponse.json(unit)
    } catch (error) {
        console.error('単位詳細取得エラー:', error)
        return NextResponse.json({ error: '単位詳細の取得に失敗しました' }, { status: 500 })
    }
}

// PUT /api/units/:id
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
        const validatedData = unitSchema.parse(body)

        const existingUnit = await prisma.unit.findUnique({
            where: { id: params.id },
        })

        if (!existingUnit) {
            return NextResponse.json({ error: '単位が見つかりません' }, { status: 404 })
        }

        const duplicateName = await prisma.unit.findFirst({
            where: { name: validatedData.name, id: { not: params.id } },
        })

        if (duplicateName) {
            return NextResponse.json({ error: 'この単位名は既に使用されています' }, { status: 409 })
        }

        const unit = await prisma.unit.update({
            where: { id: params.id },
            data: { name: validatedData.name },
        })

        return NextResponse.json({ success: true, unit })
    } catch (error) {
        console.error('単位更新エラー:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'バリデーションエラー', details: error.issues }, { status: 400 })
        }

        return NextResponse.json({ error: '単位の更新に失敗しました' }, { status: 500 })
    }
}

// DELETE /api/units/:id
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

        const existingUnit = await prisma.unit.findUnique({
            where: { id: params.id },
        })

        if (!existingUnit) {
            return NextResponse.json({ error: '単位が見つかりません' }, { status: 404 })
        }

        await prisma.unit.delete({ where: { id: params.id } })

        return NextResponse.json({ success: true, message: '単位を削除しました' })
    } catch (error) {
        console.error('単位削除エラー:', error)
        return NextResponse.json({ error: '単位の削除に失敗しました' }, { status: 500 })
    }
}
