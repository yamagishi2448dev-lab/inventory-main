/**
 * APIレスポンスヘルパー
 * キャッシュ制御とレスポンス生成
 */

import { NextResponse } from 'next/server'

/**
 * マスターデータ用のキャッシュヘッダー
 * - max-age=60: ブラウザキャッシュを60秒保持
 * - stale-while-revalidate=300: 古いキャッシュを表示しつつ5分間バックグラウンド更新
 */
export const MASTER_DATA_CACHE_HEADERS = {
    'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
    'Content-Type': 'application/json; charset=utf-8',
}

/**
 * 統計データ用のキャッシュヘッダー
 * - max-age=30: ブラウザキャッシュを30秒保持
 * - stale-while-revalidate=60: 古いキャッシュを表示しつつ1分間バックグラウンド更新
 */
export const STATS_CACHE_HEADERS = {
    'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
    'Content-Type': 'application/json; charset=utf-8',
}

/**
 * キャッシュなし（デフォルト）
 */
export const NO_CACHE_HEADERS = {
    'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    'Content-Type': 'application/json; charset=utf-8',
}

/**
 * マスターデータ用のレスポンスを生成
 */
export function masterDataResponse<T>(data: T, status = 200) {
    return NextResponse.json(data, {
        status,
        headers: MASTER_DATA_CACHE_HEADERS,
    })
}

/**
 * 統計データ用のレスポンスを生成
 */
export function statsResponse<T>(data: T, status = 200) {
    return NextResponse.json(data, {
        status,
        headers: STATS_CACHE_HEADERS,
    })
}
