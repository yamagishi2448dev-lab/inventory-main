import { NextRequest, NextResponse } from 'next/server'
import { deleteSession } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('inventory_session')?.value

    if (token) {
      // セッション削除
      await deleteSession(token)
    }

    // レスポンス作成
    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    )

    // Cookieからセッショントークンを削除
    response.cookies.delete('inventory_session')

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
