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

// GET /api/units - 単位一覧取得
export async function GET() {
    const auth = await authenticateRequest()
    if (!auth.success) {
        return auth.response
    }

    try {
        const units = await prisma.unit.findMany({
            include: {
                _count: { select: { items: true } },
            },
            orderBy: { name: 'asc' },
        })

        const unitsWithLegacyCounts = units.map((unit) => {
            const itemCount = unit._count?.items ?? 0
            return {
                ...unit,
                _count: {
                    ...unit._count,
                    products: itemCount,
                },
            }
        })

        return NextResponse.json({ units: unitsWithLegacyCounts })
    } catch (error) {
        console.error('単位一覧取得エラー:', error)
        return NextResponse.json(
            { error: '単位一覧の取得に失敗しました' },
            { status: 500 }
        )
    }
}

// POST /api/units - 単位新規作成
export async function POST(request: NextRequest) {
    const auth = await authenticateRequest()
    if (!auth.success) {
        return auth.response
    }

    try {
        const body = await request.json()
        const validatedData = unitSchema.parse(body)

        const existingUnit = await prisma.unit.findUnique({
            where: { name: validatedData.name },
        })

        if (existingUnit) {
            return NextResponse.json(
                { error: 'この単位名は既に使用されています' },
                { status: 409 }
            )
        }

        const unit = await prisma.unit.create({
            data: { name: validatedData.name },
        })

        return NextResponse.json({ success: true, unit }, { status: 201 })
    } catch (error) {
        console.error('単位作成エラー:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'バリデーションエラー', details: error.issues },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: '単位の作成に失敗しました' },
            { status: 500 }
        )
    }
}
