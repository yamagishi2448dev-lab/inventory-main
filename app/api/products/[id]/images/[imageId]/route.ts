import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { unlink } from 'fs/promises'
import path from 'path'
import { deleteFromCloudinary } from '@/lib/cloudinary'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const params = await context.params
    const { id: productId, imageId } = params

    // 画像を取得
    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
    })

    if (!image) {
      return NextResponse.json(
        { error: '画像が見つかりません' },
        { status: 404 }
      )
    }

    // 商品に紐づいているか確認
    if (image.productId !== productId) {
      return NextResponse.json(
        { error: '指定された商品の画像ではありません' },
        { status: 403 }
      )
    }

    // データベースから削除
    await prisma.productImage.delete({
      where: { id: imageId },
    })

    // ストレージから画像を削除
    if (image.url.startsWith('/uploads/')) {
      // ローカルファイルの削除（開発環境）
      try {
        const filepath = path.join(process.cwd(), 'public', image.url)
        await unlink(filepath)
      } catch (err) {
        console.error('ファイルの削除に失敗しました:', err)
      }
    } else if (image.url.includes('cloudinary.com')) {
      // Cloudinary画像の削除
      try {
        await deleteFromCloudinary(image.url)
      } catch (err) {
        console.error('Cloudinary画像の削除に失敗しました:', err)
      }
    }

    return NextResponse.json({
      success: true,
      message: '画像を削除しました',
    })
  } catch (error) {
    console.error('画像削除エラー:', error)
    return NextResponse.json(
      { error: '画像の削除に失敗しました' },
      { status: 500 }
    )
  }
}
