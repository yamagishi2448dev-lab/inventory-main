import { NextResponse } from 'next/server'

// v3.0: 素材はItems APIで直接管理
// このエンドポイントは廃止予定

export async function POST() {
  return NextResponse.json(
    { error: 'このエンドポイントは廃止されました。/api/items/:id を使用してください。' },
    { status: 410 }
  )
}
