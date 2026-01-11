import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'
import { z } from 'zod'

// バリデーションスキーマ
const settingUpdateSchema = z.object({
  value: z.string().max(10000, '値は10000文字以内で入力してください'),
})

// GET /api/settings/:key - 設定値取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const { key } = await params

    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    })

    if (!setting) {
      return NextResponse.json(
        { error: '設定が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { setting },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    )
  } catch (error) {
    console.error('Setting fetch error:', error)
    return NextResponse.json(
      { error: '設定の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// PUT /api/settings/:key - 設定値更新（ADMIN権限必須）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  // ADMIN権限チェック
  if (auth.user?.role !== 'ADMIN') {
    return NextResponse.json(
      { error: '管理者権限が必要です' },
      { status: 403 }
    )
  }

  try {
    const { key } = await params
    const body = await request.json()
    const validatedData = settingUpdateSchema.parse(body)

    // 設定の存在確認または作成
    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value: validatedData.value },
      create: { key, value: validatedData.value },
    })

    return NextResponse.json(
      { setting },
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
    console.error('Setting update error:', error)
    return NextResponse.json(
      { error: '設定の更新に失敗しました' },
      { status: 500 }
    )
  }
}
