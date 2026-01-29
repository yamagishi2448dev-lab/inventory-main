import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('inventory_session')?.value

    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      )
    }

    // セッション検証
    const session = await getSession(token)
    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      )
    }

    // ユーザー情報取得
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    })

    if (!user) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    )
  }
}
