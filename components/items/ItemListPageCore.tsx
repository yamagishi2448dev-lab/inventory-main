'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFilters } from '@/lib/hooks/useFilters'
import { formatPrice } from '@/lib/utils'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { ItemWithRelations, PaginationData, QuantityMode, ItemSortField, ItemType } from '@/lib/types'
import { LayoutGrid, List, Download, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, Filter, Search, X, Printer, Eye, Upload, MoreHorizontal } from 'lucide-react'
import { ItemGridView } from '@/components/items/ItemGridView'
import { BulkActionsBar as ItemBulkActionsBar } from '@/components/items/BulkActionsBar'
import { BulkActionsBar as ProductBulkActionsBar } from '@/components/products/BulkActionsBar'
import { BulkActionsBar as ConsignmentBulkActionsBar } from '@/components/consignments/BulkActionsBar'
import { BulkEditDialog as ItemBulkEditDialog } from '@/components/items/BulkEditDialog'
import { BulkEditDialog as ProductBulkEditDialog } from '@/components/products/BulkEditDialog'
import { BulkEditDialog as ConsignmentBulkEditDialog } from '@/components/consignments/BulkEditDialog'
import { getItemUiConfig, type ItemUiMode } from '@/lib/items/ui-config'

// ソートフィールドの型
type SortField = Exclude<ItemSortField, 'createdAt'>
type SortOrder = 'asc' | 'desc'

interface ItemListPageCoreProps {
  mode: ItemUiMode
}

export default function ItemListPageCore({ mode }: ItemListPageCoreProps) {
  const config = getItemUiConfig(mode)
  const [items, setItems] = useState<ItemWithRelations[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 選択状態管理
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [selectAllLoading, setSelectAllLoading] = useState(false)
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  // URLパラメータでフィルター状態を管理
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // アイテムタイプ (product | consignment | all)
  const typeParam = searchParams.get('type') as ItemType | null
  const itemType: ItemType | undefined = config.fixedItemType
    || (typeParam === 'PRODUCT' || typeParam === 'CONSIGNMENT' ? typeParam : undefined)

  // ビューモード状態 (list | grid)
  const viewParam = searchParams.get('view')
  const resolvedViewMode: 'list' | 'grid' = viewParam === 'grid' ? 'grid' : 'list'
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(resolvedViewMode)

  // URLからフィルター値を取得
  const search = searchParams.get('search') || ''
  const categoryId = searchParams.get('categoryId') || ''
  const manufacturerId = searchParams.get('manufacturerId') || ''
  const locationId = searchParams.get('locationId') || ''
  const tagIds = useMemo(
    () => searchParams.get('tagIds')?.split(',').filter(Boolean) || [],
    [searchParams]
  )
  const includeSold = searchParams.get('includeSold') === 'true'
  const sortBy = (searchParams.get('sortBy') || '') as SortField | ''
  const sortOrder = (searchParams.get('sortOrder') || '') as SortOrder | ''
  const currentPage = Number(searchParams.get('page')) || 1
  const detailQuery = searchParams.toString()
  const buildDetailHref = useCallback((id: string) => {
    return detailQuery
      ? `${config.detailPathPrefix}/${id}?${detailQuery}`
      : `${config.detailPathPrefix}/${id}`
  }, [detailQuery, config.detailPathPrefix])

  useEffect(() => {
    setViewMode(resolvedViewMode)
  }, [resolvedViewMode])

  // searchInputはデバウンス用に維持
  const [searchInput, setSearchInput] = useState(search)

  // 選択肢用のデータ
  const { categories, manufacturers, locations, tags } = useFilters()

  // フィルターがアクティブかどうか
  const hasActiveFilters = !!(search || categoryId || manufacturerId || locationId || tagIds.length > 0 || sortBy || includeSold)

  // URL更新関数
  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // フィルター変更時はページを1にリセット
    if (key !== 'page') {
      params.delete('page')
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  // タイプ切り替え関数
  const handleTypeChange = useCallback((newType: string) => {
    if (!config.allowTypeTabs) {
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    if (newType === 'all') {
      params.delete('type')
    } else {
      params.set('type', newType)
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [config.allowTypeTabs, searchParams, router, pathname])

  // ソート切り替え関数
  const toggleSort = useCallback((field: SortField) => {
    const params = new URLSearchParams(searchParams.toString())

    if (sortBy === field) {
      if (sortOrder === 'asc') {
        params.set('sortOrder', 'desc')
      } else if (sortOrder === 'desc') {
        params.delete('sortBy')
        params.delete('sortOrder')
      } else {
        params.set('sortOrder', 'asc')
      }
    } else {
      params.set('sortBy', field)
      params.set('sortOrder', 'asc')
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname, sortBy, sortOrder])

  // 検索実行（300msデバウンス）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        updateFilter('search', searchInput)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, search, updateFilter])

  // URLのsearch変更時にsearchInputを同期
  useEffect(() => {
    setSearchInput(search)
  }, [search])

  const fetchItems = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: String(DEFAULT_PAGE_SIZE),
      })

      if (itemType) params.append('type', itemType)
      if (search) params.append('search', search)
      if (categoryId) params.append('categoryId', categoryId)
      if (manufacturerId) params.append('manufacturerId', manufacturerId)
      if (locationId) params.append('locationId', locationId)
      if (tagIds.length > 0) params.append('tagIds', tagIds.join(','))
      if (includeSold) params.append('includeSold', 'true')
      if (sortBy) params.append('sortBy', sortBy)
      if (sortOrder) params.append('sortOrder', sortOrder)

      const response = await fetch(`${config.listEndpoint}?${params.toString()}`)

      if (!response.ok) {
        throw new Error(`${config.itemLabel}一覧の取得に失敗しました`)
      }

      const data = await response.json()
      const list = data?.[config.listResponseKey]
      setItems(Array.isArray(list) ? list : [])
      setPagination(data.pagination)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [itemType, search, categoryId, manufacturerId, locationId, tagIds, includeSold, sortBy, sortOrder, config.listEndpoint, config.listResponseKey, config.itemLabel])

  useEffect(() => {
    fetchItems(currentPage)
  }, [fetchItems, currentPage])

  useEffect(() => {
    const rawSelection = sessionStorage.getItem(config.selectionStorageKey)
    if (!rawSelection) {
      return
    }

    try {
      const savedIds = JSON.parse(rawSelection)
      if (Array.isArray(savedIds)) {
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
  }, [selectedItemIds, config.selectionStorageKey])

  const handlePageChange = (newPage: number) => {
    updateFilter('page', newPage.toString())
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(config.importEndpoint, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'CSVインポートに失敗しました')
      }

      const errorCount = Array.isArray(data.errors) ? data.errors.length : 0
      let message = `インポート完了: ${data.imported}件`
      if (errorCount > 0) {
        const preview = data.errors
          .slice(0, 3)
          .map((err: { row: number; message: string }) => `行${err.row}: ${err.message}`)
          .join('\n')
        message += `\nエラー: ${errorCount}件\n${preview}`
      }
      alert(message)
      await fetchItems(currentPage)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'CSVインポートに失敗しました')
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  const handleViewModeChange = (mode: 'list' | 'grid') => {
    if (mode === viewMode) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', mode)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const isAllPageSelected = items.length > 0 && items.every((item) => selectedItemIds.has(item.id))
  const isSomePageSelected = items.some((item) => selectedItemIds.has(item.id))
  const hasSelection = selectedItemIds.size > 0
  const isAllFilteredSelected = pagination.total > 0 && selectedItemIds.size === pagination.total

  // チェックボックス関連のハンドラー
  const handleSelectAll = () => {
    const newSelection = new Set(selectedItemIds)

    if (isAllPageSelected) {
      items.forEach((item) => newSelection.delete(item.id))
    } else {
      items.forEach((item) => newSelection.add(item.id))
    }

    setSelectedItemIds(newSelection)
  }

  const handleSelectItem = (itemId: string) => {
    const newSelection = new Set(selectedItemIds)
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId)
    } else {
      newSelection.add(itemId)
    }
    setSelectedItemIds(newSelection)
  }

  const handleSelectAllFiltered = async () => {
    try {
      setSelectAllLoading(true)
      const params = new URLSearchParams()

      if (itemType) params.append('type', itemType)
      if (search) params.append('search', search)
      if (categoryId) params.append('categoryId', categoryId)
      if (manufacturerId) params.append('manufacturerId', manufacturerId)
      if (locationId) params.append('locationId', locationId)
      if (tagIds.length > 0) params.append('tagIds', tagIds.join(','))
      if (includeSold) params.append('includeSold', 'true')
      if (sortBy) params.append('sortBy', sortBy)
      if (sortOrder) params.append('sortOrder', sortOrder)

      const response = await fetch(`${config.idsEndpoint}?${params.toString()}`)

      if (!response.ok) {
        throw new Error('フィルタ結果の一括選択に失敗しました')
      }

      const data = await response.json()
      const responseIds = data?.[config.idsResponseKey]
      const ids = Array.isArray(responseIds)
        ? responseIds.filter((id: unknown): id is string => typeof id === 'string')
        : []
      setSelectedItemIds(new Set(ids))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'フィルタ結果の一括選択に失敗しました')
    } finally {
      setSelectAllLoading(false)
    }
  }

  const handleOpenPrintView = () => {
    if (!hasSelection) {
      alert(`印刷する${config.itemLabel}を選択してください`)
      return
    }

    const payload = {
      [config.printRequestIdsKey]: Array.from(selectedItemIds),
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
    }

    try {
      sessionStorage.setItem(config.printSelectionStorageKey, JSON.stringify(payload))
      router.push(config.printPath)
    } catch {
      alert('印刷画面の準備に失敗しました')
    }
  }

  const handleClearSelection = useCallback(() => {
    setSelectedItemIds(new Set())
    sessionStorage.removeItem(config.selectionStorageKey)
  }, [config.selectionStorageKey])

  // 一括削除
  const handleBulkDelete = async () => {
    if (selectedItemIds.size === 0) return

    try {
      setBulkOperationLoading(true)
      const response = await fetch(config.bulkDeleteEndpoint, {
        method: config.bulkDeleteMethod,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [config.bulkRequestIdsKey]: Array.from(selectedItemIds),
        }),
      })

      if (!response.ok) {
        throw new Error('一括削除に失敗しました')
      }

      const data = await response.json()
      alert(data.message || `${config.itemLabel}を削除しました`)
      setSelectedItemIds(new Set())
      setBulkDeleteOpen(false)
      fetchItems(pagination.page)
    } catch (err) {
      alert(err instanceof Error ? err.message : '一括削除に失敗しました')
    } finally {
      setBulkOperationLoading(false)
    }
  }

  // 一括編集
  const handleBulkEdit = async (updates: {
    locationId?: string
    manufacturerId?: string
    categoryId?: string
    tagIds?: string[]
    quantity?: {
      mode: QuantityMode
      value: number
    }
  }) => {
    if (selectedItemIds.size === 0) return

    try {
      setBulkOperationLoading(true)
      const response = await fetch(config.bulkEditEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [config.bulkRequestIdsKey]: Array.from(selectedItemIds),
          updates,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '一括編集に失敗しました')
      }

      const data = await response.json()
      alert(data.message)
      setSelectedItemIds(new Set())
      setBulkEditOpen(false)
      fetchItems(pagination.page)
    } catch (err) {
      alert(err instanceof Error ? err.message : '一括編集に失敗しました')
    } finally {
      setBulkOperationLoading(false)
    }
  }

  const handleClearFilters = useCallback(() => {
    handleClearSelection()
    setSearchInput('')
    const params = new URLSearchParams()
    if (viewMode === 'grid') {
      params.set('view', 'grid')
    }
    if (itemType && config.allowTypeTabs) {
      params.set('type', itemType)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [router, pathname, viewMode, itemType, handleClearSelection, config.allowTypeTabs])

  // ソートアイコンを取得
  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-3 w-3" />
    }
    if (sortOrder === 'asc') {
      return <ArrowUp className="h-3 w-3" />
    }
    return <ArrowDown className="h-3 w-3" />
  }

  // ソート可能なヘッダーコンポーネント
  const SortableHeader = ({ field, children, className = '' }: { field: SortField, children: React.ReactNode, className?: string }) => (
    <div className={`flex items-center gap-1 ${className}`}>
      <span>{children}</span>
      <button
        onClick={() => toggleSort(field)}
        className={`p-0.5 rounded hover:bg-gray-200 ${sortBy === field ? 'text-blue-600' : 'text-gray-400'}`}
        title="並び替え"
      >
        {getSortIcon(field)}
      </button>
    </div>
  )

  // フィルタードロップダウンコンポーネント
  const FilterDropdown = ({
    field,
    options,
    currentValue,
    label
  }: {
    field: 'categoryId' | 'manufacturerId' | 'locationId'
    options: { id: string; name: string }[]
    currentValue: string
    label: string
  }) => {
    const [open, setOpen] = useState(false)
    const [filterSearch, setFilterSearch] = useState('')

    const filteredOptions = options.filter((option) =>
      option.name.toLowerCase().includes(filterSearch.toLowerCase())
    )

    const selectedName = options.find(o => o.id === currentValue)?.name

    return (
      <Popover open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) setFilterSearch('')
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`h-8 text-xs ${currentValue ? 'border-blue-500 text-blue-600' : ''}`}
          >
            <Filter className="h-3 w-3 mr-1" />
            {selectedName || label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-2">
            <Input
              placeholder={`${label}を検索...`}
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="h-7 text-xs"
            />
            <div className="space-y-1 max-h-48 overflow-y-auto">
              <button
                onClick={() => {
                  updateFilter(field, '')
                  setOpen(false)
                }}
                className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 ${!currentValue ? 'bg-blue-50 text-blue-600' : ''}`}
              >
                すべて
              </button>
              {filteredOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    updateFilter(field, option.id)
                    setOpen(false)
                  }}
                  className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 ${currentValue === option.id ? 'bg-blue-50 text-blue-600' : ''}`}
                >
                  {option.name}
                </button>
              ))}
              {filteredOptions.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">該当なし</p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  // タグフィルタードロップダウンコンポーネント
  const TagFilterDropdown = () => {
    const [open, setOpen] = useState(false)
    const [filterSearch, setFilterSearch] = useState('')

    const filteredTags = tags.filter((tag) =>
      tag.name.toLowerCase().includes(filterSearch.toLowerCase())
    )

    const toggleTag = (tagId: string) => {
      const newTagIds = tagIds.includes(tagId)
        ? tagIds.filter((id) => id !== tagId)
        : [...tagIds, tagId]
      updateFilter('tagIds', newTagIds.join(','))
    }

    const clearTags = () => {
      updateFilter('tagIds', '')
      setOpen(false)
    }

    return (
      <Popover open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) setFilterSearch('')
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`h-8 text-xs ${tagIds.length > 0 ? 'border-blue-500 text-blue-600' : ''}`}
          >
            <Filter className="h-3 w-3 mr-1" />
            {tagIds.length > 0 ? `タグ(${tagIds.length})` : 'タグ'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-2">
            <Input
              placeholder="タグを検索..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="h-7 text-xs"
            />
            <div className="space-y-1 max-h-48 overflow-y-auto">
              <button
                onClick={clearTags}
                className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 ${tagIds.length === 0 ? 'bg-blue-50 text-blue-600' : ''}`}
              >
                すべて
              </button>
              {filteredTags.map((tag) => (
                <label
                  key={tag.id}
                  className="flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-gray-100 cursor-pointer"
                >
                  <Checkbox
                    checked={tagIds.includes(tag.id)}
                    onCheckedChange={() => toggleTag(tag.id)}
                  />
                  {tag.name}
                </label>
              ))}
              {filteredTags.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">該当なし</p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  // タイプに応じたラベル
  const getTypeLabel = () => {
    if (itemType === 'PRODUCT') return '商品'
    if (itemType === 'CONSIGNMENT') return '委託品'
    return config.itemLabel
  }

  const exportHref = config.mode === 'items' && itemType
    ? `${config.exportEndpoint}?type=${itemType}`
    : config.exportEndpoint

  const newItemHref = config.allowTypeTabs && itemType
    ? `${config.newPath}?type=${itemType}`
    : config.newPath

  const BulkActionsBarComponent = mode === 'products'
    ? ProductBulkActionsBar
    : mode === 'consignments'
      ? ConsignmentBulkActionsBar
      : ItemBulkActionsBar

  const BulkEditDialogComponent = mode === 'products'
    ? ProductBulkEditDialog
    : mode === 'consignments'
      ? ConsignmentBulkEditDialog
      : ItemBulkEditDialog

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* タブ: 種別切り替え + ビュー切替 + インポート/エクスポート */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* 左: タブ */}
        {config.allowTypeTabs && (
          <Tabs value={itemType || 'all'} onValueChange={handleTypeChange} className="w-full sm:w-auto">
            <TabsList className="grid w-full sm:w-auto sm:inline-flex grid-cols-3">
              <TabsTrigger value="all">すべて</TabsTrigger>
              <TabsTrigger value="PRODUCT">商品</TabsTrigger>
              <TabsTrigger value="CONSIGNMENT">委託品</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* 右: ビュー切替 + インポート/エクスポート */}
        <div className="flex items-center gap-2">
          {/* ビュー切替ボタン群 */}
          <div className="flex items-center border rounded-md p-0.5 bg-white">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => handleViewModeChange('list')}
              title="リスト表示"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => handleViewModeChange('grid')}
              title="写真表示"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>

          {/* デスクトップ: インポート/エクスポートボタン群 */}
          <div className="hidden sm:flex items-center gap-2">
            <a href={config.importTemplateEndpoint} download>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                テンプレート
              </Button>
            </a>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleImportClick}
              disabled={importing}
            >
              <Upload className="h-3 w-3 mr-1" />
              {importing ? '取込中...' : 'インポート'}
            </Button>
            <a href={exportHref} download>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <Download className="h-3 w-3 mr-1" />
                CSV
              </Button>
            </a>
          </div>

          {/* モバイル: メニューポップオーバー */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs sm:hidden">
                <MoreHorizontal className="h-3.5 w-3.5 mr-1" />
                メニュー
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-2">
              <div className="flex flex-col gap-2">
                <a href={config.importTemplateEndpoint} download>
                  <Button variant="outline" size="sm" className="h-8 text-xs w-full justify-start">
                    テンプレート
                  </Button>
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs justify-start"
                  onClick={handleImportClick}
                  disabled={importing}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  {importing ? '取込中...' : 'インポート'}
                </Button>
                <a href={exportHref} download>
                  <Button variant="outline" size="sm" className="h-8 text-xs w-full justify-start">
                    <Download className="h-3 w-3 mr-1" />
                    CSV
                  </Button>
                </a>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ヘッダー: タイトル、検索、アクションボタン */}
      <div className="rounded-lg border bg-white/70 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">{pagination.total}件</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:flex-1 lg:justify-center">
            {/* 検索ボックス */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={`${config.itemNameLabel}、仕様で検索...`}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8 w-full h-8 text-xs"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* フィルタードロップダウン群 */}
            <div className="flex flex-wrap items-center gap-2">
              <FilterDropdown
                field="manufacturerId"
                options={manufacturers}
                currentValue={manufacturerId}
                label="メーカー"
              />
              <FilterDropdown
                field="categoryId"
                options={categories}
                currentValue={categoryId}
                label="品目"
              />
              <FilterDropdown
                field="locationId"
                options={locations}
                currentValue={locationId}
                label="場所"
              />
              <TagFilterDropdown />
            </div>

            {/* 販売済みを含むトグル */}
            <div className="flex items-center gap-2 px-2 py-1 border rounded-md bg-white">
              <Checkbox
                id="include-sold"
                checked={includeSold}
                onCheckedChange={(checked) => updateFilter('includeSold', checked ? 'true' : '')}
              />
              <label htmlFor="include-sold" className="text-xs cursor-pointer whitespace-nowrap">
                販売済みを含む
              </label>
            </div>

            {/* フィルターリセットボタン */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className="h-8 text-xs w-full sm:w-auto"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              リセット
            </Button>
          </div>

          <div className="flex items-center gap-2 lg:justify-end">
            {/* 印刷ボタン */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleOpenPrintView}
              disabled={!hasSelection}
            >
              <Printer className="h-3 w-3 mr-1" />
              印刷
            </Button>

            {/* 新規登録ボタン */}
            <Link href={newItemHref}>
              <Button size="sm" className="h-8 text-xs">新規登録</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 一括操作ツールバー */}
      <BulkActionsBarComponent
        selectedCount={selectedItemIds.size}
        onClearSelection={handleClearSelection}
        onBulkDelete={() => setBulkDeleteOpen(true)}
        onBulkEdit={() => setBulkEditOpen(true)}
      />

      <input
        ref={importInputRef}
        type="file"
        accept=".csv"
        onChange={handleImportFileChange}
        className="hidden"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-white/70 px-3 py-2 text-xs text-slate-600">
        <span>
          選択 {selectedItemIds.size} / {pagination.total}件
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleSelectAllFiltered}
            disabled={selectAllLoading || pagination.total === 0 || isAllFilteredSelected}
          >
            {selectAllLoading
              ? '全件選択中...'
              : isAllFilteredSelected
                ? '全件選択済み'
                : 'フィルタ結果を全件選択'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {viewMode === 'list' ? (
            <>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'list' ? (
            <div className="border rounded-lg overflow-x-auto bg-white/80 shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100/70">
                    <TableHead className="w-8 py-1.5 px-2">
                      <Checkbox
                        checked={
                          isAllPageSelected
                            ? true
                            : isSomePageSelected
                              ? 'indeterminate'
                              : false
                        }
                        onCheckedChange={handleSelectAll}
                        aria-label="全選択"
                      />
                    </TableHead>
                    {/* 種別列（全件表示時のみ） */}
                    {!itemType && (
                      <TableHead className="py-1.5 px-2 w-16">
                        <span className="text-xs font-medium">種別</span>
                      </TableHead>
                    )}
                    <TableHead className="py-1.5 px-2">
                      <SortableHeader field="manufacturer">
                        <span className="text-xs font-medium">メーカー</span>
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="py-1.5 px-2">
                      <SortableHeader field="category">
                        <span className="text-xs font-medium">品目</span>
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="py-1.5 px-2">
                      <SortableHeader field="name">
                        <span className="text-xs font-medium">{config.itemNameLabel}</span>
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="py-1.5 px-2">
                      <SortableHeader field="specification">
                        <span className="text-xs font-medium">仕様</span>
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="py-1.5 px-2">
                      <span className="text-xs font-medium">サイズ</span>
                    </TableHead>
                    <TableHead className="py-1.5 px-2 text-right">
                      <SortableHeader field="quantity" className="justify-end">
                        <span className="text-xs font-medium">個数</span>
                      </SortableHeader>
                    </TableHead>
                    {/* 原価単価列（商品のみ、または全件表示時） */}
                    {(itemType !== 'CONSIGNMENT') && (
                      <TableHead className="py-1.5 px-2 text-right">
                        <SortableHeader field="costPrice" className="justify-end">
                          <span className="text-xs font-medium">原価単価</span>
                        </SortableHeader>
                      </TableHead>
                    )}
                    <TableHead className="py-1.5 px-2 text-right">
                      <span className="text-xs font-medium">定価単価</span>
                    </TableHead>
                    <TableHead className="py-1.5 px-2">
                      <SortableHeader field="location">
                        <span className="text-xs font-medium">場所</span>
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="py-1.5 px-2">
                      <span className="text-xs font-medium">タグ</span>
                    </TableHead>
                    {hasSelection && (
                      <TableHead className="w-12 py-1.5 px-2">
                        <span className="text-xs font-medium">詳細</span>
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={hasSelection ? 13 : 12} className="text-xs py-4 px-2 text-center text-gray-500">
                        {getTypeLabel()}が登録されていません
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => {
                      const isSelected = selectedItemIds.has(item.id)
                      const isSold = item.isSold
                      return (
                        <TableRow
                          key={item.id}
                          className={`${isSelected ? 'bg-blue-50/60' : isSold ? 'bg-gray-100' : ''} ${isSold ? 'text-gray-400' : ''} cursor-pointer transition-colors hover:bg-blue-50/40 hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.2)]`}
                          onClick={() => {
                            if (hasSelection) {
                              handleSelectItem(item.id)
                              return
                            }
                            router.push(buildDetailHref(item.id))
                          }}
                        >
                          <TableCell className="py-1 px-2">
                            <div onClick={(event) => event.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleSelectItem(item.id)}
                                aria-label={`選択: ${item.name}`}
                              />
                            </div>
                          </TableCell>
                          {/* 種別列（全件表示時のみ） */}
                          {!itemType && (
                            <TableCell className="py-1 px-2">
                              <Badge variant={item.itemType === 'PRODUCT' ? 'default' : 'secondary'} className="text-[10px]">
                                {item.itemType === 'PRODUCT' ? '商品' : '委託'}
                              </Badge>
                            </TableCell>
                          )}
                          <TableCell className="text-xs py-1 px-2">{item.manufacturer?.name || '-'}</TableCell>
                          <TableCell className="text-xs py-1 px-2">{item.category?.name || '-'}</TableCell>
                          <TableCell className={`text-xs py-1 px-2 max-w-[180px] truncate ${isSold ? '' : 'font-medium'}`}>
                            {item.name}
                            {isSold && <span className="ml-1 text-[10px] text-gray-400">(販売済)</span>}
                          </TableCell>
                          <TableCell className="text-xs py-1 px-2 max-w-[120px] truncate">
                            {item.specification || '-'}
                          </TableCell>
                          <TableCell className="text-xs py-1 px-2 max-w-[120px] truncate">
                            {item.size || '-'}
                          </TableCell>
                          <TableCell className="text-xs py-1 px-2 text-right">
                            {item.quantity}
                            {item.unit ? ` ${item.unit.name}` : ''}
                          </TableCell>
                          {/* 原価単価列（商品のみ、または全件表示時） */}
                          {(itemType !== 'CONSIGNMENT') && (
                            <TableCell className="text-xs py-1 px-2 text-right">
                              {item.itemType === 'PRODUCT' && item.costPrice
                                ? formatPrice(item.costPrice as string)
                                : '-'}
                            </TableCell>
                          )}
                          <TableCell className="text-xs py-1 px-2 text-right">
                            {item.listPrice ? formatPrice(item.listPrice as string) : '-'}
                          </TableCell>
                          <TableCell className="text-xs py-1 px-2">{item.location?.name || '-'}</TableCell>
                          <TableCell className="text-xs py-1 px-2">
                            <div className="flex flex-wrap gap-1">
                              {item.tags && item.tags.length > 0 ? (
                                item.tags.map((itemTag) => (
                                  <Badge key={itemTag.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {itemTag.tag?.name}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                          </TableCell>
                          {hasSelection && (
                            <TableCell className="py-1 px-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(buildDetailHref(item.id))
                                }}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <ItemGridView
              items={items}
              selectedItemIds={selectedItemIds}
              onSelectionChange={handleSelectItem}
              selectionActive={hasSelection}
              detailQuery={detailQuery}
              showItemType={!itemType}
            />
          )}

          {/* ページネーション */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => handlePageChange(1)}
                disabled={pagination.page === 1}
                title="最初のページ"
              >
                {'<<'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                前へ
              </Button>
              {(() => {
                const pages: (number | string)[] = []
                const current = pagination.page
                const total = pagination.totalPages

                pages.push(1)

                const start = Math.max(2, current - 2)
                const end = Math.min(total - 1, current + 2)

                if (start > 2) {
                  pages.push('...')
                }

                for (let i = start; i <= end; i++) {
                  pages.push(i)
                }

                if (end < total - 1) {
                  pages.push('...')
                }

                if (total > 1) {
                  pages.push(total)
                }

                return pages.map((page, index) => (
                  typeof page === 'string' ? (
                    <span key={`ellipsis-${index}`} className="px-2 text-xs text-gray-400">...</span>
                  ) : (
                    <Button
                      key={page}
                      variant={page === current ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 w-7 text-xs p-0"
                      onClick={() => handlePageChange(page)}
                      disabled={page === current}
                    >
                      {page}
                    </Button>
                  )
                ))
              })()}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                次へ
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.page === pagination.totalPages}
                title="最後のページ"
              >
                {'>>'}
              </Button>
            </div>
          )}
        </>
      )}

      {/* 一括編集ダイアログ */}
      <BulkEditDialogComponent
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        selectedCount={selectedItemIds.size}
        categories={categories}
        manufacturers={manufacturers}
        locations={locations}
        tags={tags}
        onSubmit={handleBulkEdit}
        isLoading={bulkOperationLoading}
        showCostPrice={itemType !== 'CONSIGNMENT'}
      />

      {/* 一括削除確認ダイアログ */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getTypeLabel()}を一括削除</DialogTitle>
            <DialogDescription>
              選択した{selectedItemIds.size}件の{getTypeLabel()}を削除してもよろしいですか？
              <br />
              この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteOpen(false)}
              disabled={bulkOperationLoading}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkOperationLoading}
            >
              {bulkOperationLoading ? '削除中...' : '削除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
