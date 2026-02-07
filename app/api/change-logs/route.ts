import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'

// GET /api/change-logs - 変更履歴一覧取得
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const normalizedLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20

    const changeLogs = await prisma.changeLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: normalizedLimit,  // 最大100件
    })

    // JSONで保存されているchangesをパースして返す
    const formattedLogs = changeLogs.map((log) => ({
      ...log,
      changes: (() => {
        if (!log.changes) {
          return null
        }
        try {
          return JSON.parse(log.changes)
        } catch {
          return null
        }
      })(),
    }))

    return NextResponse.json(
      { changeLogs: formattedLogs },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    )
  } catch (error) {
    console.error('Change logs fetch error:', error)
    return NextResponse.json(
      { error: '変更履歴の取得に失敗しました' },
      { status: 500 }
    )
  }
}
