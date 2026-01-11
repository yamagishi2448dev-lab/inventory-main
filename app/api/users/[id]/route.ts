import { NextRequest, NextResponse } from 'next/server'
import { authenticateAdmin } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/prisma'
import { updateUserSchema } from '@/lib/validations/user'
import { ZodError } from 'zod'

/**
 * PUT /api/users/[id]
 * ユーザー情報を更新（管理者のみ）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 管理者認証チェック
  const authResult = await authenticateAdmin()
  if (!authResult.success) {
    return authResult.response
  }

  try {
    const { id } = await params
    const body = await request.json()

    // バリデーション
    const validatedData = updateUserSchema.parse(body)

    // 更新対象ユーザーの存在確認
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        {
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      )
    }

    // ユーザー名の重複チェック（変更する場合のみ）
    if (validatedData.username && validatedData.username !== existingUser.username) {
      const duplicateUser = await prisma.user.findUnique({
        where: { username: validatedData.username },
      })

      if (duplicateUser) {
        return NextResponse.json(
          { error: 'このユーザー名は既に使用されています' },
          {
            status: 409,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          }
        )
      }
    }

    // ユーザー更新
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(validatedData.username && { username: validatedData.username }),
        ...(validatedData.role && { role: validatedData.role }),
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      { user: updatedUser },
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || '入力内容に誤りがあります' },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      )
    }

    console.error('ユーザー更新エラー:', error)
    return NextResponse.json(
      { error: 'ユーザーの更新に失敗しました' },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    )
  }
}

/**
 * DELETE /api/users/[id]
 * ユーザーを削除（管理者のみ）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 管理者認証チェック
  const authResult = await authenticateAdmin()
  if (!authResult.success) {
    return authResult.response
  }

  try {
    const { id } = await params

    // 削除対象ユーザーの取得
    const targetUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        {
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      )
    }

    // 自分自身の削除を防止
    if (targetUser.id === authResult.user.id) {
      return NextResponse.json(
        { error: '自分自身を削除することはできません' },
        {
          status: 403,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      )
    }

    // 最後の管理者の削除を防止
    if (targetUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' },
      })

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: '最後の管理者を削除することはできません' },
          {
            status: 403,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          }
        )
      }
    }

    // ユーザー削除（セッションもカスケード削除される）
    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json(
      { message: 'ユーザーを削除しました' },
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    )
  } catch (error) {
    console.error('ユーザー削除エラー:', error)
    return NextResponse.json(
      { error: 'ユーザーの削除に失敗しました' },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    )
  }
}
