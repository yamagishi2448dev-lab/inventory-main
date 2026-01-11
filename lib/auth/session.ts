import { prisma } from '@/lib/db/prisma'
import { Session } from '@prisma/client'
import crypto from 'crypto'
import { SESSION_EXPIRY_DAYS } from '@/lib/constants'


/**
 * ランダムなトークンを生成する
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * トークンをハッシュ化する
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * セッションを作成する
 * @returns トークン（プレーンテキスト）
 */
export async function createSession(userId: string): Promise<string> {
  const token = generateToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS)

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  })

  return token
}

/**
 * トークンからセッションを取得する
 */
export async function getSession(token: string) {
  const tokenHash = hashToken(token)

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: true,
    },
  })

  if (!session) {
    return null
  }

  // 有効期限切れチェック
  if (session.expiresAt < new Date()) {
    // 期限切れセッションを削除
    await prisma.session.delete({
      where: { id: session.id },
    })
    return null
  }

  return session
}

/**
 * セッションを削除する
 */
export async function deleteSession(token: string): Promise<void> {
  const tokenHash = hashToken(token)

  await prisma.session.deleteMany({
    where: { tokenHash },
  })
}

/**
 * ユーザーの全セッションを削除する
 */
export async function deleteUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  })
}
