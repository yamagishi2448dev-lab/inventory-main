import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { createSession } from '@/lib/auth/session'
import { z } from 'zod'

const loginSchema = z.object({
  username: z.string().min(1, 'ユーザー名は必須です'),
  password: z.string().min(1, 'パスワードは必須です'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = loginSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { username, password } = result.data

    const devAutoSeedAdmin = process.env.NODE_ENV !== 'production'
      && process.env.DEV_AUTO_SEED_ADMIN === 'true'
    const devAdminUsername = process.env.DEV_ADMIN_USERNAME ?? 'admin'
    const devAdminPassword = process.env.DEV_ADMIN_PASSWORD ?? 'password123'

    let user = await prisma.user.findUnique({
      where: { username },
    })

    if (!user) {
      if (devAutoSeedAdmin && username === devAdminUsername && password === devAdminPassword) {
        const passwordHash = await hashPassword(devAdminPassword)
        user = await prisma.user.upsert({
          where: { username: devAdminUsername },
          update: {
            passwordHash,
            role: 'ADMIN',
          },
          create: {
            username: devAdminUsername,
            passwordHash,
            role: 'ADMIN',
          },
        })
      } else {
        return NextResponse.json(
          { success: false, error: 'ユーザー名またはパスワードが正しくありません' },
          { status: 401 }
        )
      }
    }

    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'ユーザー名またはパスワードが正しくありません' },
        { status: 401 }
      )
    }

    const token = await createSession(user.id)

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      },
      { status: 200 }
    )

    response.cookies.set('inventory_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
