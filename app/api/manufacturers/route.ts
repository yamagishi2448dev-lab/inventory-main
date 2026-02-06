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

// GET /api/manufacturers - メーカー一覧取得
export async function GET() {
    // 認証チェック
    const auth = await authenticateRequest()
    if (!auth.success) {
        return auth.response
    }

    try {
        const manufacturers = await prisma.manufacturer.findMany({
            include: {
                _count: {
                    select: { items: true },
                },
            },
            orderBy: {
                name: 'asc',
            },
        })

        const manufacturersWithLegacyCounts = manufacturers.map((manufacturer) => {
            const itemCount = manufacturer._count?.items ?? 0
            return {
                ...manufacturer,
                _count: {
                    ...manufacturer._count,
                    products: itemCount,
                },
            }
        })

        return NextResponse.json({ manufacturers: manufacturersWithLegacyCounts })
    } catch (error) {
        console.error('メーカー一覧取得エラー:', error)
        return NextResponse.json(
            { error: 'メーカー一覧の取得に失敗しました' },
            { status: 500 }
        )
    }
}

// POST /api/manufacturers - メーカー新規作成
export async function POST(request: NextRequest) {
    // 認証チェック
    const auth = await authenticateRequest()
    if (!auth.success) {
        return auth.response
    }

    try {
        const body = await request.json()

        // バリデーション
        const validatedData = manufacturerSchema.parse(body)

        // メーカー名の重複チェック
        const existingManufacturer = await prisma.manufacturer.findUnique({
            where: { name: validatedData.name },
        })

        if (existingManufacturer) {
            return NextResponse.json(
                { error: 'このメーカー名は既に使用されています' },
                { status: 409 }
            )
        }

        // メーカー作成
        const manufacturer = await prisma.manufacturer.create({
            data: {
                name: validatedData.name,
            },
        })

        return NextResponse.json(
            { success: true, manufacturer },
            { status: 201 }
        )
    } catch (error) {
        console.error('メーカー作成エラー:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'バリデーションエラー', details: error.issues },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'メーカーの作成に失敗しました' },
            { status: 500 }
        )
    }
}
