import { prisma } from '../db/prisma'

/**
 * 新しいSKUを生成する
 * 形式: SKU-NNNNN（5桁ゼロ埋め）
 * 例: SKU-00001, SKU-00002, ...
 */
export async function generateSku(): Promise<string> {
    // シーケンスカウンター方式: SystemSettingテーブルでカウンターを管理
    const result = await prisma.$transaction(async (tx) => {
        // 現在のカウンター値を取得または初期化
        const setting = await tx.systemSetting.findUnique({
            where: { key: 'next_product_sku' }
        })

        let nextNumber = 1
        if (setting) {
            nextNumber = parseInt(setting.value, 10)
        }

        // カウンターをインクリメント
        await tx.systemSetting.upsert({
            where: { key: 'next_product_sku' },
            update: { value: String(nextNumber + 1) },
            create: { key: 'next_product_sku', value: String(nextNumber + 1) }
        })

        return nextNumber
    })

    return `SKU-${result.toString().padStart(5, '0')}`
}

/**
 * SKUフォーマットの検証
 * @param sku 検証するSKU
 * @returns 有効なSKU形式の場合true
 */
export function isValidSkuFormat(sku: string): boolean {
    return /^SKU-\d{5}$/.test(sku)
}

/**
 * 新しい委託品SKUを生成する
 * 形式: CSG-NNNNN（5桁ゼロ埋め）
 * 例: CSG-00001, CSG-00002, ...
 */
export async function generateConsignmentSku(): Promise<string> {
    // シーケンスカウンター方式: SystemSettingテーブルでカウンターを管理
    const result = await prisma.$transaction(async (tx) => {
        // 現在のカウンター値を取得または初期化
        const setting = await tx.systemSetting.findUnique({
            where: { key: 'next_consignment_sku' }
        })

        let nextNumber = 1
        if (setting) {
            nextNumber = parseInt(setting.value, 10)
        }

        // カウンターをインクリメント
        await tx.systemSetting.upsert({
            where: { key: 'next_consignment_sku' },
            update: { value: String(nextNumber + 1) },
            create: { key: 'next_consignment_sku', value: String(nextNumber + 1) }
        })

        return nextNumber
    })

    return `CSG-${result.toString().padStart(5, '0')}`
}

/**
 * 委託品SKUフォーマットの検証
 * @param sku 検証するSKU
 * @returns 有効なSKU形式の場合true
 */
export function isValidConsignmentSkuFormat(sku: string): boolean {
    return /^CSG-\d{5}$/.test(sku)
}

// ===== v3.0 Item統合用 =====

import type { ItemType } from '@/lib/types'

/**
 * アイテム種別に応じたSKUを生成する
 * @param itemType アイテム種別（PRODUCT または CONSIGNMENT）
 * @returns 生成されたSKU
 */
export async function generateItemSku(itemType: ItemType): Promise<string> {
    if (itemType === 'CONSIGNMENT') {
        return generateConsignmentSku()
    }
    return generateSku()
}

/**
 * SKUからアイテム種別を判定
 * @param sku SKU文字列
 * @returns アイテム種別（不明な場合はnull）
 */
export function getItemTypeFromSku(sku: string): ItemType | null {
    if (isValidSkuFormat(sku)) {
        return 'PRODUCT'
    }
    if (isValidConsignmentSkuFormat(sku)) {
        return 'CONSIGNMENT'
    }
    return null
}

/**
 * アイテムSKUフォーマットの検証（商品または委託品）
 * @param sku 検証するSKU
 * @returns 有効なSKU形式の場合true
 */
export function isValidItemSkuFormat(sku: string): boolean {
    return isValidSkuFormat(sku) || isValidConsignmentSkuFormat(sku)
}
