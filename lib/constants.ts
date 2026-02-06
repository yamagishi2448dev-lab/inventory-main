/**
 * アプリケーション定数
 * マジックナンバーや設定値を一元管理
 */

// ==========================================
// ページネーション
// ==========================================

/** デフォルトページサイズ */
export const DEFAULT_PAGE_SIZE = 20

/** 最大ページサイズ */
export const MAX_PAGE_SIZE = 100

// ==========================================
// 印刷
// ==========================================

/** 印刷選択情報の保存キー */
export const PRINT_SELECTION_STORAGE_KEY = 'inventory_print_selection'

/** 商品選択状態の保存キー */
export const PRODUCT_SELECTION_STORAGE_KEY = 'inventory_product_selection'

/** 委託品選択状態の保存キー (v2.1) */
export const CONSIGNMENT_SELECTION_STORAGE_KEY = 'inventory_consignment_selection'

/** 委託品印刷選択情報の保存キー (v2.1) */
export const CONSIGNMENT_PRINT_SELECTION_STORAGE_KEY = 'inventory_consignment_print_selection'

/** アイテム選択状態の保存キー (v3.0) */
export const ITEM_SELECTION_STORAGE_KEY = 'inventory_item_selection'

// ==========================================
// セッション・認証
// ==========================================

/** セッション有効期限（日数） */
export const SESSION_EXPIRY_DAYS = 7

/** セッションCookie名 */
export const SESSION_COOKIE_NAME = 'inventory_session'

// ==========================================
// バリデーション
// ==========================================

/** 商品名の最大文字数 */
export const MAX_PRODUCT_NAME_LENGTH = 200

/** 説明の最大文字数 */
export const MAX_DESCRIPTION_LENGTH = 2000

/** 商品画像の最大枚数 */
export const MAX_PRODUCT_IMAGES = 5

/** 画像の最大ファイルサイズ（バイト） */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

// ==========================================
// 許可されるファイル形式
// ==========================================

/** 許可される画像MIME型 */
export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
] as const

// ==========================================
// 在庫アラート
// ==========================================

/** 低在庫アラートの閾値 */
export const LOW_STOCK_THRESHOLD = 10

/** ダッシュボード表示件数 */
export const DASHBOARD_RECENT_ITEMS = 5
