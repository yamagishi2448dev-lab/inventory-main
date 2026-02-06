import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/auth/middleware'

// 場所バリデーションスキーマ (v2.0)
const locationSchema = z.object({
    name: z
        .string()
        .min(1, '場所名は必須です')
        .max(100, '場所名は100文字以内で入力してください'),
})

// GET /api/locations - 場所一覧取得
export async function GET() {
    const auth = await authenticateRequest()
    if (!auth.success) {
        return auth.response
    }

    try {
        const locations = await prisma.location.findMany({
            include: {
                _count: {
                    select: { items: true },
                },
            },
            orderBy: {
                name: 'asc',
            },
        })

        const locationsWithLegacyCounts = locations.map((location) => {
            const itemCount = location._count?.items ?? 0
            return {
                ...location,
                _count: {
                    ...location._count,
                    products: itemCount,
                },
            }
        })

        return NextResponse.json({ locations: locationsWithLegacyCounts })
    } catch (error) {
        console.error('場所一覧取得エラー:', error)
        return NextResponse.json(
            { error: '場所一覧の取得に失敗しました' },
            { status: 500 }
        )
    }
}

// POST /api/locations - 場所新規作成
export async function POST(request: NextRequest) {
    const auth = await authenticateRequest()
    if (!auth.success) {
        return auth.response
    }

    try {
        const body = await request.json()
        const validatedData = locationSchema.parse(body)

        const existingLocation = await prisma.location.findUnique({
            where: { name: validatedData.name },
        })

        if (existingLocation) {
            return NextResponse.json(
                { error: 'この場所名は既に使用されています' },
                { status: 409 }
            )
        }

        const location = await prisma.location.create({
            data: { name: validatedData.name },
        })

        return NextResponse.json(
            { success: true, location },
            { status: 201 }
        )
    } catch (error) {
        console.error('場所作成エラー:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'バリデーションエラー', details: error.issues },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: '場所の作成に失敗しました' },
            { status: 500 }
        )
    }
}
