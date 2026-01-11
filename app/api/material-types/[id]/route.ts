import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'
import { z } from 'zod'

// バリデーションスキーマ
const updateMaterialTypeSchema = z.object({
  name: z
    .string()
    .min(1, '素材項目名は必須です')
    .max(50, '素材項目名は50文字以内で入力してください')
    .optional(),
  order: z.number().int().min(0).optional(),
})

// GET /api/material-types/:id - 素材項目詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const { id } = await params

    const materialType = await prisma.materialType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { materials: true },
        },
      },
    })

    if (!materialType) {
      return NextResponse.json(
        { error: '素材項目が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { materialType },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    )
  } catch (error) {
    console.error('Material type fetch error:', error)
    return NextResponse.json(
      { error: '素材項目の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// PUT /api/material-types/:id - 素材項目更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = updateMaterialTypeSchema.parse(body)

    // 存在チェック
    const existing = await prisma.materialType.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '素材項目が見つかりません' },
        { status: 404 }
      )
    }

    // 名前の重複チェック（自分以外）
    if (validatedData.name && validatedData.name !== existing.name) {
      const duplicate = await prisma.materialType.findUnique({
        where: { name: validatedData.name },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'この素材項目名は既に使用されています' },
          { status: 409 }
        )
      }
    }

    const materialType = await prisma.materialType.update({
      where: { id },
      data: {
        ...(validatedData.name !== undefined && { name: validatedData.name }),
        ...(validatedData.order !== undefined && { order: validatedData.order }),
      },
    })

    return NextResponse.json(
      { materialType },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Material type update error:', error)
    return NextResponse.json(
      { error: '素材項目の更新に失敗しました' },
      { status: 500 }
    )
  }
}

// DELETE /api/material-types/:id - 素材項目削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const { id } = await params

    // 存在チェック
    const existing = await prisma.materialType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { materials: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '素材項目が見つかりません' },
        { status: 404 }
      )
    }

    // 使用中チェック
    if (existing._count.materials > 0) {
      return NextResponse.json(
        { error: 'この素材項目は使用中のため削除できません' },
        { status: 409 }
      )
    }

    await prisma.materialType.delete({
      where: { id },
    })

    return NextResponse.json(
      { message: '素材項目を削除しました' },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    )
  } catch (error) {
    console.error('Material type delete error:', error)
    return NextResponse.json(
      { error: '素材項目の削除に失敗しました' },
      { status: 500 }
    )
  }
}
