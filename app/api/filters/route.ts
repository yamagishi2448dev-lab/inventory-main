import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'

// GET /api/filters - フィルター用マスターデータ一括取得
export async function GET() {
  // 認証チェック（1回のみ）
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    // 全マスターデータを並列取得
    const [categories, manufacturers, locations, units, tags] = await Promise.all([
      prisma.category.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.manufacturer.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.location.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.unit.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.tag.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ])

    return NextResponse.json({
      categories,
      manufacturers,
      locations,
      units,
      tags,
    })
  } catch (error) {
    console.error('フィルターデータ取得エラー:', error)
    return NextResponse.json(
      { error: 'フィルターデータの取得に失敗しました' },
      { status: 500 }
    )
  }
}
