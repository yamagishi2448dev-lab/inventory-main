import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { categorySchema } from '@/lib/validations/category'
import { z } from 'zod'

// GET /api/categories/:id - カテゴリ詳細取得
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { items: true },
        },
      },
    })

    if (!category) {
      return NextResponse.json(
        { error: 'カテゴリが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('カテゴリ詳細取得エラー:', error)
    return NextResponse.json(
      { error: 'カテゴリ詳細の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// PUT /api/categories/:id - カテゴリ更新
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()

    // バリデーション
    const validatedData = categorySchema.parse(body)

    // カテゴリの存在確認
    const existingCategory = await prisma.category.findUnique({
      where: { id: params.id },
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'カテゴリが見つかりません' },
        { status: 404 }
      )
    }

    // カテゴリ名の重複チェック（自分以外で同じ名前がないか）
    const duplicateName = await prisma.category.findFirst({
      where: {
        name: validatedData.name,
        id: { not: params.id },
      },
    })

    if (duplicateName) {
      return NextResponse.json(
        { error: 'このカテゴリ名は既に使用されています' },
        { status: 409 }
      )
    }

    // カテゴリ更新
    const category = await prisma.category.update({
      where: { id: params.id },
      data: {
        name: validatedData.name,
      },
    })

    return NextResponse.json({
      success: true,
      category,
    })
  } catch (error) {
    console.error('カテゴリ更新エラー:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'カテゴリの更新に失敗しました' },
      { status: 500 }
    )
  }
}

// DELETE /api/categories/:id - カテゴリ削除
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params

    // カテゴリの存在確認
    const existingCategory = await prisma.category.findUnique({
      where: { id: params.id },
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'カテゴリが見つかりません' },
        { status: 404 }
      )
    }

    // カテゴリ削除（商品との紐付けはSetNull）
    await prisma.category.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: 'カテゴリを削除しました',
    })
  } catch (error) {
    console.error('カテゴリ削除エラー:', error)
    return NextResponse.json(
      { error: 'カテゴリの削除に失敗しました' },
      { status: 500 }
    )
  }
}
