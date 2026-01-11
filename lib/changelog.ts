import { prisma } from '@/lib/db/prisma'

export type ChangeLogAction = 'create' | 'update' | 'delete'
export type ChangeLogEntityType = 'product' | 'consignment'

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
}

/**
 * 変更履歴を作成する
 */
export async function createChangeLog(params: CreateChangeLogParams): Promise<void> {
  const { entityType, entityId, entityName, entitySku, action, changes, userId, userName } = params

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
      },
    })
  } catch (error) {
    console.error('Failed to create change log:', error)
    // 変更履歴の記録に失敗しても処理は続行する
  }
}

/**
 * 変更内容を比較してChangeLogFieldsを生成する
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
 * 商品の変更を比較するためのフィールドラベル定義
 */
export const PRODUCT_FIELD_LABELS: Record<string, string> = {
  name: '商品名',
  manufacturerId: 'メーカー',
  categoryId: '品目',
  specification: '仕様',
  size: 'サイズ',
  fabricColor: '張地/カラー',
  quantity: '個数',
  unitId: '単位',
  costPrice: '原価単価',
  listPrice: '定価単価',
  arrivalDate: '入荷年月',
  locationId: '場所',
  notes: '備考',
  isSold: '販売済み',
}
