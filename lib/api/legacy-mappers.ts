export function mapItemsToLegacyList(
  payload: unknown,
  key: 'products' | 'consignments'
): unknown {
  if (!payload || typeof payload !== 'object') {
    return payload
  }

  const data = payload as Record<string, unknown>
  if (!Array.isArray(data.items)) {
    return payload
  }

  const { items, ...rest } = data
  return {
    [key]: items,
    ...rest,
  }
}

export function mapItemToLegacyEntity(
  payload: unknown,
  key: 'product' | 'consignment'
): unknown {
  if (!payload || typeof payload !== 'object') {
    return payload
  }

  const data = payload as Record<string, unknown>
  if (!('item' in data)) {
    return payload
  }

  const { item, ...rest } = data
  return {
    ...rest,
    [key]: item,
  }
}

export function mapIdsToLegacy(
  payload: unknown,
  key: 'productIds' | 'consignmentIds'
): unknown {
  if (!payload || typeof payload !== 'object') {
    return payload
  }

  const data = payload as Record<string, unknown>
  if (!Array.isArray(data.ids)) {
    return payload
  }

  return {
    [key]: data.ids,
  }
}

export function filterPrintItemsByType(
  payload: unknown,
  key: 'products' | 'consignments',
  itemType: 'PRODUCT' | 'CONSIGNMENT'
): unknown {
  if (!payload || typeof payload !== 'object') {
    return payload
  }

  const data = payload as Record<string, unknown>
  if (!Array.isArray(data.items)) {
    return payload
  }

  const filteredItems = data.items.filter((item) => {
    if (!item || typeof item !== 'object') {
      return false
    }

    const value = (item as { itemType?: unknown }).itemType
    if (typeof value !== 'string') {
      return true
    }

    return value.toUpperCase() === itemType
  })

  return {
    [key]: filteredItems,
  }
}

export function extractIds(payload: unknown, keys: string[]): string[] {
  if (!payload || typeof payload !== 'object') {
    return []
  }

  const data = payload as Record<string, unknown>

  for (const key of keys) {
    const value = data[key]
    if (Array.isArray(value)) {
      return value.filter((entry): entry is string => typeof entry === 'string')
    }
  }

  return []
}

export function normalizeBulkEditPayload(payload: unknown, legacyIdsKey: string) {
  const ids = extractIds(payload, [legacyIdsKey, 'ids'])

  if (!payload || typeof payload !== 'object') {
    return { ids, updates: {} }
  }

  const data = payload as Record<string, unknown>
  const updates =
    data.updates && typeof data.updates === 'object'
      ? { ...(data.updates as Record<string, unknown>) }
      : {}

  if (updates.quantity && typeof updates.quantity === 'object') {
    const quantity = { ...(updates.quantity as Record<string, unknown>) }
    if (quantity.mode === 'increment') {
      quantity.mode = 'adjust'
    }
    updates.quantity = quantity
  }

  return { ids, updates }
}
