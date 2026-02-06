import { NextResponse } from 'next/server'

// v3.0: 画像はItems APIで管理
// このエンドポイントは廃止予定

export async function POST() {
  return NextResponse.json(
    { error: 'このエンドポイントは廃止されました。/api/items/:id を使用してください。' },
    { status: 410 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'このエンドポイントは廃止されました。/api/items/:id を使用してください。' },
    { status: 410 }
  )
}
