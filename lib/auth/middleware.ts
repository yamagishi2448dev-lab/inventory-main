/**
 * API認証ミドルウェア
 * APIルートで使用する認証チェック関数
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSession } from './session'
import { prisma } from '@/lib/db/prisma'
import { SESSION_COOKIE_NAME } from '@/lib/constants'

/** 認証済みユーザー情報 */
export interface AuthenticatedUser {
    id: string
    username: string
    role: string
}

/** 認証結果 */
export type AuthResult =
    | { success: true; user: AuthenticatedUser }
    | { success: false; response: NextResponse }

/**
 * APIルート用の認証チェック
 * @returns 認証成功時はユーザー情報、失敗時はエラーレスポンス
 */
export async function authenticateRequest(): Promise<AuthResult> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

        if (!token) {
            return {
                success: false,
                response: NextResponse.json(
                    { error: '認証が必要です' },
                    { status: 401 }
                ),
            }
        }

        const session = await getSession(token)
        if (!session) {
            return {
                success: false,
                response: NextResponse.json(
                    { error: 'セッションが無効または期限切れです' },
                    { status: 401 }
                ),
            }
        }

        // getSession()は既にuserを含んでいる（include: { user: true }）
        return {
            success: true,
            user: {
                id: session.user.id,
                username: session.user.username,
                role: session.user.role,
            },
        }
    } catch (error) {
        console.error('認証エラー:', error)
        return {
            success: false,
            response: NextResponse.json(
                { error: '認証処理中にエラーが発生しました' },
                { status: 500 }
            ),
        }
    }
}

/**
 * 管理者権限チェック
 * @param user 認証済みユーザー
 * @returns 管理者かどうか
 */
export function isAdmin(user: AuthenticatedUser): boolean {
    return user.role === 'ADMIN'
}

/**
 * 管理者権限が必要なAPIルート用のチェック
 * @returns 認証成功時はユーザー情報、失敗時はエラーレスポンス
 */
export async function authenticateAdmin(): Promise<AuthResult> {
    const authResult = await authenticateRequest()

    if (!authResult.success) {
        return authResult
    }

    if (!isAdmin(authResult.user)) {
        return {
            success: false,
            response: NextResponse.json(
                { error: '管理者権限が必要です' },
                { status: 403 }
            ),
        }
    }

    return authResult
}
