import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('inventory_session')?.value

    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      )
    }

    // 繧ｻ繝・す繝ｧ繝ｳ讀懆ｨｼ
    const session = await getSession(token)
    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      )
    }

    const user = session.user

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


