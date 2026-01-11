import { prisma } from '../db/prisma'

/**
 * 新しいSKUを生成する
 * 形式: SKU-NNNNN（5桁ゼロ埋め）
 * 例: SKU-00001, SKU-00002, ...
 */
export async function generateSku(): Promise<string> {
    // 最新のSKUを取得
    const lastProduct = await prisma.product.findFirst({
        orderBy: { sku: 'desc' },
        select: { sku: true }
    })

    let nextNumber = 1

    if (lastProduct?.sku) {
        const match = lastProduct.sku.match(/SKU-(\d+)/)
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1
        }
    }

    return `SKU-${nextNumber.toString().padStart(5, '0')}`
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
    // 最新のSKUを取得
    const lastConsignment = await prisma.consignment.findFirst({
        orderBy: { sku: 'desc' },
        select: { sku: true }
    })

    let nextNumber = 1

    if (lastConsignment?.sku) {
        const match = lastConsignment.sku.match(/CSG-(\d+)/)
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1
        }
    }

    return `CSG-${nextNumber.toString().padStart(5, '0')}`
}

/**
 * 委託品SKUフォーマットの検証
 * @param sku 検証するSKU
 * @returns 有効なSKU形式の場合true
 */
export function isValidConsignmentSkuFormat(sku: string): boolean {
    return /^CSG-\d{5}$/.test(sku)
}
