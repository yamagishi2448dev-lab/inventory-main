import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { tagSchema } from '@/lib/validations/tag'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/auth/middleware'

// GET /api/tags/:id - タグ詳細取得
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const params = await context.params
    const tag = await prisma.tag.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { items: true },
        },
      },
    })

    if (!tag) {
      return NextResponse.json(
        { error: 'タグが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(tag)
  } catch (error) {
    console.error('タグ詳細取得エラー:', error)
    return NextResponse.json(
      { error: 'タグ詳細の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// PUT /api/tags/:id - タグ更新
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const params = await context.params
    const body = await request.json()

    // バリデーション
    const validatedData = tagSchema.parse(body)

    // タグの存在確認
    const existingTag = await prisma.tag.findUnique({
      where: { id: params.id },
    })

    if (!existingTag) {
      return NextResponse.json(
        { error: 'タグが見つかりません' },
        { status: 404 }
      )
    }

    // タグ名の重複チェック（自分以外で同じ名前がないか）
    const duplicateName = await prisma.tag.findFirst({
      where: {
        name: validatedData.name,
        id: { not: params.id },
      },
    })

    if (duplicateName) {
      return NextResponse.json(
        { error: 'このタグ名は既に使用されています' },
        { status: 409 }
      )
    }

    // タグ更新
    const tag = await prisma.tag.update({
      where: { id: params.id },
      data: {
        name: validatedData.name,
      },
    })

    return NextResponse.json({
      success: true,
      tag,
    })
  } catch (error) {
    console.error('タグ更新エラー:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'タグの更新に失敗しました' },
      { status: 500 }
    )
  }
}

// DELETE /api/tags/:id - タグ削除
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const params = await context.params

    // タグの存在確認
    const existingTag = await prisma.tag.findUnique({
      where: { id: params.id },
    })

    if (!existingTag) {
      return NextResponse.json(
        { error: 'タグが見つかりません' },
        { status: 404 }
      )
    }

    // タグ削除（商品・委託品との紐付けはCascade削除）
    await prisma.tag.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: 'タグを削除しました',
    })
  } catch (error) {
    console.error('タグ削除エラー:', error)
    return NextResponse.json(
      { error: 'タグの削除に失敗しました' },
      { status: 500 }
    )
  }
}
