'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type {
  ItemType,
  ItemWithRelations,
  PaginationData,
  QuantityMode,
} from '@/lib/types'
import type { ItemUiConfig } from '@/lib/items/ui-config'

interface ListFilters {
  search: string
  categoryId: string
  manufacturerId: string
  locationId: string
  tagIds: string[]
  includeSold: boolean
  sortBy: string
  sortOrder: string
}

interface BulkEditUpdates {
  locationId?: string
  manufacturerId?: string
  categoryId?: string
  tagIds?: string[]
  quantity?: {
    mode: QuantityMode
    value: number
  }
}

interface UseItemListStateOptions {
  config: ItemUiConfig
  itemType?: ItemType
  currentPage: number
  filters: ListFilters
}

interface UseItemListStateResult {
  items: ItemWithRelations[]
  pagination: PaginationData
  loading: boolean
  error: string | null
  selectedItemIds: Set<string>
  selectAllLoading: boolean
  importing: boolean
  bulkOperationLoading: boolean
  hasSelection: boolean
  isAllPageSelected: boolean
  isSomePageSelected: boolean
  isAllFilteredSelected: boolean
  fetchItems: (page?: number) => Promise<void>
  clearSelection: () => void
  toggleSelection: (itemId: string) => void
  togglePageSelection: () => void
  selectAllFiltered: () => Promise<void>
  submitBulkDelete: () => Promise<{ success: boolean; message?: string }>
  submitBulkEdit: (updates: BulkEditUpdates) => Promise<{ success: boolean; message?: string }>
  importCsv: (file: File) => Promise<{ success: boolean; message: string }>
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === 'string')
}

function getMessageFromPayload(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  const message = (payload as Record<string, unknown>).message
  if (typeof message === 'string' && message.length > 0) {
    return message
  }

  const error = (payload as Record<string, unknown>).error
  if (typeof error === 'string' && error.length > 0) {
    return error
  }

  return fallback
}

function mapIncrementModeToAdjust(updates: BulkEditUpdates): BulkEditUpdates {
  return updates
}

export function useItemListState({
  config,
  itemType,
  currentPage,
  filters,
}: UseItemListStateOptions): UseItemListStateResult {
  const [items, setItems] = useState<ItemWithRelations[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [selectAllLoading, setSelectAllLoading] = useState(false)
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  const hasSelection = selectedItemIds.size > 0
  const isAllPageSelected = items.length > 0 && items.every((item) => selectedItemIds.has(item.id))
  const isSomePageSelected = items.some((item) => selectedItemIds.has(item.id))
  const isAllFilteredSelected = pagination.total > 0 && selectedItemIds.size === pagination.total

  const fetchItems = useCallback(async (page: number = currentPage) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        limit: String(DEFAULT_PAGE_SIZE),
      })

      if (itemType) params.set('type', itemType)
      if (filters.search) params.set('search', filters.search)
      if (filters.categoryId) params.set('categoryId', filters.categoryId)
      if (filters.manufacturerId) params.set('manufacturerId', filters.manufacturerId)
      if (filters.locationId) params.set('locationId', filters.locationId)
      if (filters.tagIds.length > 0) params.set('tagIds', filters.tagIds.join(','))
      if (filters.includeSold) params.set('includeSold', 'true')
      if (filters.sortBy) params.set('sortBy', filters.sortBy)
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)

      const response = await fetch(`${config.listEndpoint}?${params.toString()}`)
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(getMessageFromPayload(payload, `${config.pageLabel}一覧の取得に失敗しました`))
      }

      const data = (payload ?? {}) as Record<string, unknown>
      const list = data[config.listResponseKey]
      setItems(Array.isArray(list) ? (list as ItemWithRelations[]) : [])
      setPagination((data.pagination as PaginationData) ?? {
        total: 0,
        page: 1,
        limit: DEFAULT_PAGE_SIZE,
        totalPages: 0,
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [config.listEndpoint, config.listResponseKey, config.pageLabel, currentPage, filters, itemType])

  useEffect(() => {
    void fetchItems(currentPage)
  }, [fetchItems, currentPage])

  useEffect(() => {
    const rawSelection = sessionStorage.getItem(config.selectionStorageKey)
    if (!rawSelection) {
      return
    }

    try {
      const parsed = JSON.parse(rawSelection)
      const savedIds = toStringArray(parsed)
      if (savedIds.length > 0) {
        setSelectedItemIds(new Set(savedIds))
      }
    } catch {
      sessionStorage.removeItem(config.selectionStorageKey)
    }
  }, [config.selectionStorageKey])

  useEffect(() => {
    const ids = Array.from(selectedItemIds)
    if (ids.length === 0) {
      sessionStorage.removeItem(config.selectionStorageKey)
      return
    }

    sessionStorage.setItem(config.selectionStorageKey, JSON.stringify(ids))
  }, [config.selectionStorageKey, selectedItemIds])

  const clearSelection = useCallback(() => {
    setSelectedItemIds(new Set())
    sessionStorage.removeItem(config.selectionStorageKey)
  }, [config.selectionStorageKey])

  const toggleSelection = useCallback((itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }, [])

  const togglePageSelection = useCallback(() => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev)
      if (isAllPageSelected) {
        items.forEach((item) => next.delete(item.id))
      } else {
        items.forEach((item) => next.add(item.id))
      }
      return next
    })
  }, [isAllPageSelected, items])

  const selectAllFiltered = useCallback(async () => {
    try {
      setSelectAllLoading(true)
      const params = new URLSearchParams()
      if (itemType) params.set('type', itemType)
      if (filters.search) params.set('search', filters.search)
      if (filters.categoryId) params.set('categoryId', filters.categoryId)
      if (filters.manufacturerId) params.set('manufacturerId', filters.manufacturerId)
      if (filters.locationId) params.set('locationId', filters.locationId)
      if (filters.tagIds.length > 0) params.set('tagIds', filters.tagIds.join(','))
      if (filters.includeSold) params.set('includeSold', 'true')
      if (filters.sortBy) params.set('sortBy', filters.sortBy)
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)

      const response = await fetch(`${config.idsEndpoint}?${params.toString()}`)
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(getMessageFromPayload(payload, 'フィルタ結果の一括選択に失敗しました'))
      }

      const data = (payload ?? {}) as Record<string, unknown>
      const ids = toStringArray(data[config.idsResponseKey])
      setSelectedItemIds(new Set(ids))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'フィルタ結果の一括選択に失敗しました')
    } finally {
      setSelectAllLoading(false)
    }
  }, [config.idsEndpoint, config.idsResponseKey, filters, itemType])

  const submitBulkDelete = useCallback(async () => {
    if (selectedItemIds.size === 0) {
      return { success: true, message: '対象が選択されていません' }
    }

    try {
      setBulkOperationLoading(true)
      const response = await fetch(config.bulkDeleteEndpoint, {
        method: config.bulkDeleteMethod,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [config.bulkRequestIdsKey]: Array.from(selectedItemIds) }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(getMessageFromPayload(payload, '一括削除に失敗しました'))
      }

      const message = getMessageFromPayload(payload, `${config.itemLabel}を削除しました`)
      clearSelection()
      await fetchItems(pagination.page)
      return { success: true, message }
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : '一括削除に失敗しました',
      }
    } finally {
      setBulkOperationLoading(false)
    }
  }, [
    clearSelection,
    config.bulkDeleteEndpoint,
    config.bulkDeleteMethod,
    config.itemLabel,
    config.bulkRequestIdsKey,
    fetchItems,
    pagination.page,
    selectedItemIds,
  ])

  const submitBulkEdit = useCallback(async (updates: BulkEditUpdates) => {
    if (selectedItemIds.size === 0) {
      return { success: true, message: '対象が選択されていません' }
    }

    try {
      setBulkOperationLoading(true)
      const normalizedUpdates = mapIncrementModeToAdjust(updates)
      const response = await fetch(config.bulkEditEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [config.bulkRequestIdsKey]: Array.from(selectedItemIds),
          updates: normalizedUpdates,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(getMessageFromPayload(payload, '一括編集に失敗しました'))
      }

      const message = getMessageFromPayload(payload, `${config.itemLabel}を更新しました`)
      clearSelection()
      await fetchItems(pagination.page)
      return { success: true, message }
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : '一括編集に失敗しました',
      }
    } finally {
      setBulkOperationLoading(false)
    }
  }, [
    clearSelection,
    config.bulkEditEndpoint,
    config.itemLabel,
    config.bulkRequestIdsKey,
    fetchItems,
    pagination.page,
    selectedItemIds,
  ])

  const importCsv = useCallback(async (file: File) => {
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(config.importEndpoint, {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(getMessageFromPayload(payload, 'CSVインポートに失敗しました'))
      }

      await fetchItems(pagination.page)

      const imported =
        payload && typeof payload === 'object' && typeof (payload as Record<string, unknown>).imported === 'number'
          ? (payload as Record<string, unknown>).imported
          : 0

      const errors =
        payload && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).errors)
          ? ((payload as Record<string, unknown>).errors as Array<{ row?: number; message?: string }>)
          : []

      const preview = errors
        .slice(0, 3)
        .map((entry) => `行${entry.row ?? '-'}: ${entry.message ?? '-'}`)
        .join('\n')

      let message = `インポート完了: ${imported}件`
      if (errors.length > 0) {
        message += `\nエラー: ${errors.length}件`
        if (preview.length > 0) {
          message += `\n${preview}`
        }
      }

      return { success: true, message }
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'CSVインポートに失敗しました',
      }
    } finally {
      setImporting(false)
    }
  }, [config.importEndpoint, fetchItems, pagination.page])

  return useMemo(() => ({
    items,
    pagination,
    loading,
    error,
    selectedItemIds,
    selectAllLoading,
    importing,
    bulkOperationLoading,
    hasSelection,
    isAllPageSelected,
    isSomePageSelected,
    isAllFilteredSelected,
    fetchItems,
    clearSelection,
    toggleSelection,
    togglePageSelection,
    selectAllFiltered,
    submitBulkDelete,
    submitBulkEdit,
    importCsv,
  }), [
    items,
    pagination,
    loading,
    error,
    selectedItemIds,
    selectAllLoading,
    importing,
    bulkOperationLoading,
    hasSelection,
    isAllPageSelected,
    isSomePageSelected,
    isAllFilteredSelected,
    fetchItems,
    clearSelection,
    toggleSelection,
    togglePageSelection,
    selectAllFiltered,
    submitBulkDelete,
    submitBulkEdit,
    importCsv,
  ])
}
