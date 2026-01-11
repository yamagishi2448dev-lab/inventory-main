import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

// 許可される画像形式
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが選択されていません' },
        { status: 400 }
      )
    }

    // ファイル形式チェック
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: '許可されていないファイル形式です。JPEG、PNG、WebPのみアップロード可能です。' },
        { status: 400 }
      )
    }

    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'ファイルサイズが大きすぎます。最大5MBまでアップロード可能です。' },
        { status: 400 }
      )
    }

    // ファイル名のサニタイズ（ランダム文字列生成）
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 拡張子を取得
    const ext = path.extname(file.name)

    // ランダムなファイル名を生成（日付 + ランダム文字列）
    const randomString = crypto.randomBytes(16).toString('hex')
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const filename = `${timestamp}_${randomString}${ext}`

    // アップロードディレクトリのパス
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')

    // ディレクトリが存在しない場合は作成
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // ファイルを保存
    const filepath = path.join(uploadDir, filename)
    await writeFile(filepath, buffer)

    // 画像URLを返す
    const url = `/uploads/${filename}`

    return NextResponse.json({
      success: true,
      url,
    })
  } catch (error) {
    console.error('画像アップロードエラー:', error)
    return NextResponse.json(
      { error: '画像のアップロードに失敗しました' },
      { status: 500 }
    )
  }
}
