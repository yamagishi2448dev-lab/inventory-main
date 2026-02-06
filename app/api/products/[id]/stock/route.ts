import { NextResponse } from 'next/server'

// v3.0: 在庫更新はItems APIで管理
// このエンドポイントは廃止予定

export async function PATCH() {
  return NextResponse.json(
    { error: 'このエンドポイントは廃止されました。/api/items/:id を使用してください。' },
    { status: 410 }
  )
}
