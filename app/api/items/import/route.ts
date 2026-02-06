import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { productItemSchema, consignmentItemSchema } from '@/lib/validations/item'
import { authenticateRequest } from '@/lib/auth/middleware'
import { generateItemSku } from '@/lib/utils/sku'
import { createChangeLog } from '@/lib/changelog'
import { parseCSV } from '@/lib/utils/csv'
import { convertExcelSerialDate } from '@/lib/utils/date'
import { z } from 'zod'
import type { ItemType } from '@/lib/types'

const REQUIRED_HEADERS = ['種別', '商品名']

type ImportError = { row: number; message: string }

const normalizeNumber = (value: string) => value.replace(/,/g, '').trim()

const parseBoolean = (value: string) => {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return { value: undefined }
  if (['true', '1', 'yes', 'y', 'はい', '済', '販売済み'].includes(normalized)) {
    return { value: true }
  }
  if (['false', '0', 'no', 'n', 'いいえ', '未', '未販売'].includes(normalized)) {
    return { value: false }
  }
  return { error: '販売済みは はい/いいえ または true/false を入力してください' }
}

const parseDate = (value: string) => {
  if (!value.trim()) return { value: undefined }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return { error: '販売日時の形式が不正です' }
  }
  return { value: parsed.toISOString() }
}

const parseItemType = (value: string): { value?: ItemType; error?: string } => {
  const normalized = value.trim()
  if (!normalized) return { value: 'PRODUCT' }  // デフォルトは商品
  if (['商品', 'PRODUCT', 'product'].includes(normalized)) {
    return { value: 'PRODUCT' }
  }
  if (['委託品', 'CONSIGNMENT', 'consignment', '委託'].includes(normalized)) {
    return { value: 'CONSIGNMENT' }
  }
  return { error: '種別は「商品」または「委託品」を入力してください' }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'CSVファイルが選択されていません' },
        { status: 400 }
      )
    }

    const text = await file.text()
    const rows = parseCSV(text)
    if (rows.length <= 1) {
      return NextResponse.json(
        { error: 'CSVにデータがありません' },
        { status: 400 }
      )
    }

    const headers = rows[0].map((header) => header.trim())
    const headerIndex = new Map(headers.map((header, index) => [header, index]))

    for (const required of REQUIRED_HEADERS) {
      if (!headerIndex.has(required)) {
        return NextResponse.json(
          { error: `必須ヘッダーが不足しています: ${required}` },
          { status: 400 }
        )
      }
    }

    const [manufacturers, categories, locations, units, tags] = await Promise.all([
      prisma.manufacturer.findMany({ select: { id: true, name: true } }),
      prisma.category.findMany({ select: { id: true, name: true } }),
      prisma.location.findMany({ select: { id: true, name: true } }),
      prisma.unit.findMany({ select: { id: true, name: true } }),
      prisma.tag.findMany({ select: { id: true, name: true } }),
    ])

    const manufacturerMap = new Map(manufacturers.map((item) => [item.name, item.id]))
    const categoryMap = new Map(categories.map((item) => [item.name, item.id]))
    const locationMap = new Map(locations.map((item) => [item.name, item.id]))
    const unitMap = new Map(units.map((item) => [item.name, item.id]))
    const tagMap = new Map(tags.map((item) => [item.name, item.id]))

    const resolveNameId = async (
      name: string,
      map: Map<string, string>,
      create: (value: string) => Promise<{ id: string }>
    ) => {
      const trimmed = name.trim()
      if (!trimmed) return null
      const cached = map.get(trimmed)
      if (cached) return cached
      const created = await create(trimmed)
      map.set(trimmed, created.id)
      return created.id
    }

    // タグ名のパイプ区切り文字列からタグID配列を解決
    const resolveTagIds = async (tagNamesStr: string): Promise<string[]> => {
      if (!tagNamesStr.trim()) return []
      const tagNames = tagNamesStr.split('|').map((name) => name.trim()).filter(Boolean)
      const tagIds: string[] = []
      for (const name of tagNames) {
        let tagId = tagMap.get(name)
        if (!tagId) {
          const created = await prisma.tag.create({ data: { name } })
          tagMap.set(name, created.id)
          tagId = created.id
        }
        tagIds.push(tagId)
      }
      return tagIds
    }

    const errors: ImportError[] = []
    let imported = 0

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex]
      const rowNumber = rowIndex + 1

      const getValue = (headerName: string) => {
        const index = headerIndex.get(headerName)
        if (index === undefined) return ''
        return row[index]?.trim() ?? ''
      }

      // 種別の解析
      const itemTypeParsed = parseItemType(getValue('種別'))
      if (itemTypeParsed.error) {
        errors.push({ row: rowNumber, message: itemTypeParsed.error })
        continue
      }
      const itemType = itemTypeParsed.value!

      const name = getValue('商品名')
      if (!name) {
        errors.push({ row: rowNumber, message: '商品名が未入力です' })
        continue
      }

      // 原価単価（商品は必須、委託品は不要）
      const costPriceRaw = normalizeNumber(getValue('原価単価'))
      if (itemType === 'PRODUCT' && !costPriceRaw) {
        errors.push({ row: rowNumber, message: '商品の原価単価は必須です' })
        continue
      }

      const quantityRaw = normalizeNumber(getValue('個数'))
      const quantity = quantityRaw ? Number.parseInt(quantityRaw, 10) : 0
      if (!Number.isInteger(quantity) || quantity < 0) {
        errors.push({ row: rowNumber, message: '個数は0以上の整数で入力してください' })
        continue
      }

      const soldFlag = parseBoolean(getValue('販売済み'))
      if (soldFlag.error) {
        errors.push({ row: rowNumber, message: soldFlag.error })
        continue
      }

      const soldAtParsed = parseDate(getValue('販売日時'))
      if (soldAtParsed.error) {
        errors.push({ row: rowNumber, message: soldAtParsed.error })
        continue
      }

      const manufacturerId = await resolveNameId(
        getValue('メーカー'),
        manufacturerMap,
        (value) => prisma.manufacturer.create({ data: { name: value } })
      )
      const categoryId = await resolveNameId(
        getValue('品目'),
        categoryMap,
        (value) => prisma.category.create({ data: { name: value } })
      )
      const locationId = await resolveNameId(
        getValue('場所'),
        locationMap,
        (value) => prisma.location.create({ data: { name: value } })
      )
      const unitId = await resolveNameId(
        getValue('単位'),
        unitMap,
        (value) => prisma.unit.create({ data: { name: value } })
      )

      // タグの解決
      const tagIds = await resolveTagIds(getValue('タグ'))

      const isSold = soldAtParsed.value ? true : soldFlag.value ?? false
      const payload = {
        itemType,
        name,
        manufacturerId,
        categoryId,
        specification: getValue('仕様') || null,
        size: getValue('サイズ') || null,
        fabricColor: getValue('張地/カラー') || null,
        quantity,
        unitId,
        costPrice: itemType === 'PRODUCT' ? costPriceRaw : null,
        listPrice: normalizeNumber(getValue('定価単価')) || null,
        arrivalDate: convertExcelSerialDate(getValue('入荷年月')),
        locationId,
        designer: getValue('デザイナー') || null,
        notes: getValue('備考') || null,
        isSold,
        soldAt: soldAtParsed.value || null,
      }

      try {
        // 種別に応じたバリデーション
        const validated = itemType === 'PRODUCT'
          ? productItemSchema.parse(payload)
          : consignmentItemSchema.parse(payload)

        const sku = await generateItemSku(itemType)
        const item = await prisma.item.create({
          data: {
            sku,
            itemType,
            name: validated.name,
            manufacturerId: validated.manufacturerId || null,
            categoryId: validated.categoryId || null,
            specification: validated.specification || null,
            size: validated.size || null,
            fabricColor: validated.fabricColor || null,
            quantity: validated.quantity || 0,
            unitId: validated.unitId || null,
            costPrice: itemType === 'PRODUCT' ? (validated as { costPrice: string }).costPrice : null,
            listPrice: validated.listPrice || null,
            arrivalDate: validated.arrivalDate || null,
            locationId: validated.locationId || null,
            designer: validated.designer || null,
            notes: validated.notes || null,
            isSold: validated.isSold || false,
            soldAt: validated.soldAt ? new Date(validated.soldAt) : null,
          },
        })

        // タグの関連付け
        if (tagIds.length > 0) {
          await prisma.itemTag.createMany({
            data: tagIds.map((tagId) => ({
              itemId: item.id,
              tagId,
            })),
          })
        }

        if (auth.user) {
          await createChangeLog({
            entityType: 'item',
            entityId: item.id,
            entityName: item.name,
            entitySku: item.sku,
            action: 'create',
            userId: auth.user.id,
            userName: auth.user.username,
            itemType: item.itemType,
          })
        }

        imported += 1
      } catch (error) {
        if (error instanceof z.ZodError) {
          const details = error.issues.map((issue) => issue.message).join(' / ')
          errors.push({ row: rowNumber, message: `バリデーションエラー: ${details}` })
        } else {
          errors.push({ row: rowNumber, message: '登録に失敗しました' })
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      errors,
    })
  } catch (error) {
    console.error('CSVインポートエラー:', error)
    return NextResponse.json(
      { error: 'CSVインポートに失敗しました' },
      { status: 500 }
    )
  }
}
