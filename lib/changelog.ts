import { prisma } from '@/lib/db/prisma'
import type { ItemType } from '@/lib/types'

export type ChangeLogAction = 'create' | 'update' | 'delete'
export type ChangeLogEntityType = 'item' | 'product' | 'consignment'  // v3.0: 'item'が新標準

interface ChangeLogField {
  field: string
  label: string
  from?: string
  to?: string
}

interface CreateChangeLogParams {
  entityType: ChangeLogEntityType
  entityId: string
  entityName: string
  entitySku: string
  action: ChangeLogAction
  changes?: ChangeLogField[]
  userId: string
  userName: string
  itemType?: ItemType | string  // v3.0追加: 商品/委託品の区別
}

/**
 * 変更履歴を保存する
 */
export async function createChangeLog(params: CreateChangeLogParams): Promise<void> {
  const { entityType, entityId, entityName, entitySku, action, changes, userId, userName, itemType } = params

  try {
    await prisma.changeLog.create({
      data: {
        entityType,
        entityId,
        entityName,
        entitySku,
        action,
        changes: changes ? JSON.stringify({ fields: changes }) : null,
        userId,
        userName,
        itemType: itemType || null,  // v3.0追加
      },
    })
  } catch (error) {
    console.error('Failed to create change log:', error)
    // 変更履歴の失敗は主処理を止めない
  }
}

/**
 * 変更前後の差分を抽出してChangeLogFieldsに変換する
 */
export function compareChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fieldLabels: Record<string, string>
): ChangeLogField[] {
  const changes: ChangeLogField[] = []

  for (const [field, label] of Object.entries(fieldLabels)) {
    const beforeValue = formatValue(before[field])
    const afterValue = formatValue(after[field])

    if (beforeValue !== afterValue) {
      changes.push({
        field,
        label,
        from: beforeValue,
        to: afterValue,
      })
    }
  }

  return changes
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'object') {
    // Prisma Decimal
    if ('toString' in value && typeof value.toString === 'function') {
      return value.toString()
    }
    return JSON.stringify(value)
  }
  return String(value)
}

/**
 * 商品の変更履歴に表示するラベル
 */
export const PRODUCT_FIELD_LABELS: Record<string, string> = {
  name: '商品名',
  manufacturerId: 'メーカー',
  categoryId: '品目',
  specification: '仕様',
  size: 'サイズ',
  fabricColor: '生地/カラー',
  quantity: '個数',
  unitId: '単位',
  costPrice: '原価単価',
  listPrice: '定価単価',
  arrivalDate: '入荷年月',
  locationId: '場所',
  notes: '備考',
  isSold: '販売済み',
}
