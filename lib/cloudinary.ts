import { v2 as cloudinary } from 'cloudinary'

// 環境変数から認証情報を取得
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET

// Cloudinaryを設定
if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  })
}

/**
 * Cloudinary設定が有効かどうかを確認
 */
export function isCloudinaryConfigured(): boolean {
  return !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET)
}

/**
 * ファイルをCloudinaryにアップロードし、URLを返す
 *
 * @param buffer - ファイルのバッファ
 * @param filename - ファイル名（拡張子を含む）
 * @returns Cloudinary URL
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  filename: string
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary設定が不完全です。環境変数を確認してください: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET'
    )
  }

  return new Promise((resolve, reject) => {
    // ファイル名から拡張子を除去してpublic_idとして使用
    const publicId = `inventory/${filename.replace(/\.[^/.]+$/, '')}`

    cloudinary.uploader
      .upload_stream(
        {
          folder: 'inventory',
          public_id: publicId.replace('inventory/', ''),
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            reject(new Error(`Cloudinaryアップロードエラー: ${error.message}`))
          } else if (result) {
            resolve(result.secure_url)
          } else {
            reject(new Error('アップロード結果が取得できませんでした'))
          }
        }
      )
      .end(buffer)
  })
}

/**
 * Cloudinaryから画像を削除
 *
 * @param url - Cloudinary URL
 */
export async function deleteFromCloudinary(url: string): Promise<void> {
  if (!isCloudinaryConfigured()) {
    console.warn('Cloudinaryが設定されていないため、削除をスキップします')
    return
  }

  // URLからpublic_idを抽出
  // 例: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/inventory/filename.jpg
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/)
  if (!match) {
    console.warn('CloudinaryのファイルIDを抽出できませんでした:', url)
    return
  }

  const publicId = match[1]

  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (error) {
    // ファイルが存在しない場合はエラーを無視
    console.warn('Cloudinary画像の削除に失敗しました:', error)
  }
}
