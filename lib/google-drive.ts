import { google } from 'googleapis'
import { Readable } from 'stream'

// 環境変数から認証情報を取得
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY =
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID

/**
 * Google Drive APIクライアントを取得
 */
function getDriveClient() {
  if (
    !GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    !GOOGLE_DRIVE_FOLDER_ID
  ) {
    throw new Error(
      'Google Drive設定が不完全です。環境変数を確認してください: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, GOOGLE_DRIVE_FOLDER_ID'
    )
  }

  const auth = new google.auth.JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })

  return google.drive({ version: 'v3', auth })
}

/**
 * バッファをストリームに変換
 */
function bufferToStream(buffer: Buffer): Readable {
  const readable = new Readable()
  readable.push(buffer)
  readable.push(null)
  return readable
}

/**
 * ファイルをGoogle Driveにアップロードし、埋め込みURLを返す
 *
 * @param buffer - ファイルのバッファ
 * @param filename - ファイル名
 * @param mimeType - MIMEタイプ (例: 'image/jpeg')
 * @returns 埋め込みURL (https://drive.google.com/uc?export=view&id=FILE_ID)
 */
export async function uploadToGoogleDrive(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const drive = getDriveClient()

  // ファイルをアップロード
  const response = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [GOOGLE_DRIVE_FOLDER_ID!],
    },
    media: {
      mimeType,
      body: bufferToStream(buffer),
    },
    fields: 'id',
  })

  const fileId = response.data.id
  if (!fileId) {
    throw new Error('ファイルのアップロードに失敗しました')
  }

  // ファイルを公開設定（リンクを知っている全員が閲覧可能）
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  })

  // 埋め込みURLを返す
  return `https://drive.google.com/uc?export=view&id=${fileId}`
}

/**
 * Google Driveからファイルを削除
 *
 * @param url - 埋め込みURL (https://drive.google.com/uc?export=view&id=FILE_ID)
 */
export async function deleteFromGoogleDrive(url: string): Promise<void> {
  // URLからファイルIDを抽出
  const match = url.match(/[?&]id=([^&]+)/)
  if (!match) {
    console.warn('Google DriveのファイルIDを抽出できませんでした:', url)
    return
  }

  const fileId = match[1]
  const drive = getDriveClient()

  try {
    await drive.files.delete({ fileId })
  } catch (error) {
    // ファイルが存在しない場合はエラーを無視
    console.warn('Google Driveファイルの削除に失敗しました:', error)
  }
}

/**
 * Google Drive設定が有効かどうかを確認
 */
export function isGoogleDriveConfigured(): boolean {
  return !!(
    GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
    GOOGLE_DRIVE_FOLDER_ID
  )
}
