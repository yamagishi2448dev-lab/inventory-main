import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Tailwind CSSクラス名をマージ
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 価格をフォーマット（日本円表示）
 * @param price 価格（文字列またはDecimal）
 * @returns フォーマット済み価格文字列
 */
export function formatPrice(price: string | number): string {
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price
  return `¥${numericPrice.toLocaleString()}`
}
