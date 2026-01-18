'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
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
import { useFilters } from '@/lib/hooks/useFilters'
import { formatPrice } from '@/lib/utils'
import { DEFAULT_PAGE_SIZE, CONSIGNMENT_SELECTION_STORAGE_KEY, CONSIGNMENT_PRINT_SELECTION_STORAGE_KEY } from '@/lib/constants'
import type { ConsignmentWithRelations, PaginationData, ConsignmentSortField, ConsignmentSortOrder } from '@/lib/types'
import { LayoutGrid, List, Download, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, Filter, Search, X, Printer, Eye, Trash2, Upload, MoreHorizontal } from 'lucide-react'
import { BulkActionsBar } from '@/components/consignments/BulkActionsBar'
import { BulkEditDialog } from '@/components/consignments/BulkEditDialog'

// ソートフィールドの型
type SortField = Exclude<ConsignmentSortField, 'createdAt'>
type SortOrder = ConsignmentSortOrder

export default function ConsignmentsPage() {
  const [consignments, setConsignments] = useState<ConsignmentWithRelations[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 選択状態管理
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
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
    return detailQuery ? `/consignments/${id}?${detailQuery}` : `/consignments/${id}`
  }, [detailQuery])

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
    if (key !== 'page') {
      params.delete('page')
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

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

  const fetchConsignments = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: String(DEFAULT_PAGE_SIZE),
      })

      if (search) params.append('search', search)
      if (categoryId) params.append('categoryId', categoryId)
      if (manufacturerId) params.append('manufacturerId', manufacturerId)
      if (locationId) params.append('locationId', locationId)
      if (tagIds.length > 0) params.append('tagIds', tagIds.join(','))
      if (includeSold) params.append('includeSold', 'true')
      if (sortBy) params.append('sortBy', sortBy)
      if (sortOrder) params.append('sortOrder', sortOrder)

      const response = await fetch(`/api/consignments?${params.toString()}`)

      if (!response.ok) {
        throw new Error('委託品一覧の取得に失敗しました')
      }

      const data = await response.json()
      setConsignments(data.consignments)
      setPagination(data.pagination)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [search, categoryId, manufacturerId, locationId, tagIds, includeSold, sortBy, sortOrder])

  useEffect(() => {
    fetchConsignments(currentPage)
  }, [fetchConsignments, currentPage])

  // 選択状態の復元
  useEffect(() => {
    const rawSelection = sessionStorage.getItem(CONSIGNMENT_SELECTION_STORAGE_KEY)
    if (!rawSelection) return
    try {
      const savedIds = JSON.parse(rawSelection)
      if (Array.isArray(savedIds)) {
        setSelectedIds(new Set(savedIds))
      }
    } catch {
      // ignore
    }
  }, [])

  // 選択状態の保存
  useEffect(() => {
    if (selectedIds.size > 0) {
      sessionStorage.setItem(CONSIGNMENT_SELECTION_STORAGE_KEY, JSON.stringify(Array.from(selectedIds)))
    } else {
      sessionStorage.removeItem(CONSIGNMENT_SELECTION_STORAGE_KEY)
    }
  }, [selectedIds])

  // 選択操作
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const togglePageSelection = () => {
    const pageIds = consignments.map((c) => c.id)
    const allSelected = pageIds.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id))
      } else {
        pageIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const selectAllFiltered = async () => {
    try {
      setSelectAllLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (categoryId) params.append('categoryId', categoryId)
      if (manufacturerId) params.append('manufacturerId', manufacturerId)
      if (locationId) params.append('locationId', locationId)
      if (tagIds.length > 0) params.append('tagIds', tagIds.join(','))
      if (includeSold) params.append('includeSold', 'true')
      if (sortBy) params.append('sortBy', sortBy)
      if (sortOrder) params.append('sortOrder', sortOrder)
      params.append('limit', '10000')

      const response = await fetch(`/api/consignments/ids?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        const allIds = data.consignmentIds || []
        setSelectedIds(new Set(allIds))
      }
    } finally {
      setSelectAllLoading(false)
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    sessionStorage.removeItem(CONSIGNMENT_SELECTION_STORAGE_KEY)
  }

  // 一括編集
  const handleBulkEdit = async (updates: {
    locationId?: string
    manufacturerId?: string
    categoryId?: string
    tagIds?: string[]
    quantity?: {
      mode: 'set' | 'increment'
      value: number
    }
  }) => {
    if (selectedIds.size === 0) return

    try {
      setBulkOperationLoading(true)
      const response = await fetch('/api/consignments/bulk/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consignmentIds: Array.from(selectedIds),
          updates,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '一括編集に失敗しました')
      }

      const data = await response.json()
      alert(data.message)
      setSelectedIds(new Set())
      setBulkEditOpen(false)
      fetchConsignments(currentPage)
    } catch (err) {
      alert(err instanceof Error ? err.message : '一括編集に失敗しました')
    } finally {
      setBulkOperationLoading(false)
    }
  }

  // 一括削除
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    try {
      setBulkOperationLoading(true)
      const response = await fetch('/api/consignments/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consignmentIds: Array.from(selectedIds) }),
      })

      if (!response.ok) {
        throw new Error('削除に失敗しました')
      }

      clearSelection()
      fetchConsignments(currentPage)
      setBulkDeleteOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました')
    } finally {
      setBulkOperationLoading(false)
    }
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

      const response = await fetch('/api/consignments/import', {
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
      await fetchConsignments(currentPage)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'CSVインポートに失敗しました')
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  // 印刷ページへ遷移
  const handlePrint = () => {
    if (selectedIds.size === 0) {
      alert('印刷する委託品を選択してください')
      return
    }

    const payload = {
      consignmentIds: Array.from(selectedIds),
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
    }

    try {
      sessionStorage.setItem(CONSIGNMENT_PRINT_SELECTION_STORAGE_KEY, JSON.stringify(payload))
      router.push('/consignments/print')
    } catch (err) {
      alert('印刷画面の準備に失敗しました')
    }
  }

  // CSVエクスポート
  const handleExport = async () => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (categoryId) params.append('categoryId', categoryId)
    if (manufacturerId) params.append('manufacturerId', manufacturerId)
    if (locationId) params.append('locationId', locationId)
    if (tagIds.length > 0) params.append('tagIds', tagIds.join(','))
    if (includeSold) params.append('includeSold', 'true')

    window.location.href = `/api/consignments/export?${params.toString()}`
  }

  // フィルタークリア
  const clearFilters = () => {
    router.push(pathname, { scroll: false })
    setSearchInput('')
  }

  // ソートアイコン取得
  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 ml-1" />
    if (sortOrder === 'asc') return <ArrowUp className="h-3 w-3 ml-1" />
    return <ArrowDown className="h-3 w-3 ml-1" />
  }

  const hasSelection = selectedIds.size > 0
  const pageIds = consignments.map((c) => c.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))

  // フィルターセクションコンポーネント（検索機能付き）
  const FilterSection = ({
    label,
    options,
    currentValue,
    onSelect,
  }: {
    label: string
    options: { id: string; name: string }[]
    currentValue: string
    onSelect: (value: string) => void
  }) => {
    const [filterSearch, setFilterSearch] = useState('')
    const filteredOptions = options.filter((option) =>
      option.name.toLowerCase().includes(filterSearch.toLowerCase())
    )

    return (
      <div>
        <label className="text-sm font-medium">{label}</label>
        <Input
          placeholder={`${label}を検索...`}
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="mt-1 h-7 text-xs"
        />
        <div className="mt-1 space-y-1 max-h-24 overflow-y-auto border rounded p-2">
          <button
            onClick={() => onSelect('')}
            className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 ${!currentValue ? 'bg-blue-50 text-blue-600' : ''}`}
          >
            すべて
          </button>
          {filteredOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 ${currentValue === option.id ? 'bg-blue-50 text-blue-600' : ''}`}
            >
              {option.name}
            </button>
          ))}
          {filteredOptions.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-1">該当なし</p>
          )}
        </div>
      </div>
    )
  }

  // タグフィルターセクションコンポーネント（検索機能付き）
  const TagFilterSection = ({
    tags: tagOptions,
    selectedTagIds,
    onTagToggle,
  }: {
    tags: { id: string; name: string }[]
    selectedTagIds: string[]
    onTagToggle: (tagId: string) => void
  }) => {
    const [filterSearch, setFilterSearch] = useState('')
    const filteredTags = tagOptions.filter((tag) =>
      tag.name.toLowerCase().includes(filterSearch.toLowerCase())
    )

    return (
      <div>
        <label className="text-sm font-medium">タグ</label>
        <Input
          placeholder="タグを検索..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="mt-1 h-7 text-xs"
        />
        <div className="mt-1 space-y-1 max-h-24 overflow-y-auto border rounded p-2">
          {filteredTags.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-1">該当なし</p>
          ) : (
            filteredTags.map((tag) => (
              <label key={tag.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">
                <Checkbox
                  checked={selectedTagIds.includes(tag.id)}
                  onCheckedChange={() => onTagToggle(tag.id)}
                />
                {tag.name}
              </label>
            ))
          )}
        </div>
      </div>
    )
  }

  // ページネーションコントロール
  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null
    const pages: number[] = []
    const start = Math.max(1, currentPage - 2)
    const end = Math.min(pagination.totalPages, currentPage + 2)
    for (let i = start; i <= end; i++) pages.push(i)

    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          onClick={() => updateFilter('page', String(currentPage - 1))}
        >
          前へ
        </Button>
        {pages.map((page) => (
          <Button
            key={page}
            variant={page === currentPage ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('page', String(page))}
          >
            {page}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === pagination.totalPages}
          onClick={() => updateFilter('page', String(currentPage + 1))}
        >
          次へ
        </Button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => fetchConsignments(currentPage)} className="mt-4">
          再読み込み
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="rounded-lg border bg-white/70 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            {/* Title removed */}
            <p className="text-xs text-gray-500">
              {pagination.total}件
              {hasSelection && ` (${selectedIds.size}件選択中)`}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:flex-1 lg:justify-center">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="商品名、仕様で検索..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 h-8 text-xs"
              />
              {searchInput && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchInput('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 px-2 py-1 border rounded-md bg-white">
              <Checkbox
                id="includeSold"
                checked={includeSold}
                onCheckedChange={(checked) => updateFilter('includeSold', checked ? 'true' : '')}
              />
              <label htmlFor="includeSold" className="text-xs cursor-pointer whitespace-nowrap">
                販売済みを含む
              </label>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs w-full sm:w-auto"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              リセット
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={hasActiveFilters ? 'border-blue-500' : ''}>
                  <Filter className="h-4 w-4 mr-1" />
                  フィルター
                  {hasActiveFilters && <span className="ml-1 text-xs bg-blue-500 text-white rounded-full px-1.5">!</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-3">
                  <FilterSection
                    label="メーカー"
                    options={manufacturers}
                    currentValue={manufacturerId}
                    onSelect={(value) => updateFilter('manufacturerId', value)}
                  />
                  <FilterSection
                    label="品目"
                    options={categories}
                    currentValue={categoryId}
                    onSelect={(value) => updateFilter('categoryId', value)}
                  />
                  <FilterSection
                    label="場所"
                    options={locations}
                    currentValue={locationId}
                    onSelect={(value) => updateFilter('locationId', value)}
                  />
                  <TagFilterSection
                    tags={tags}
                    selectedTagIds={tagIds}
                    onTagToggle={(tagId) => {
                      const newTagIds = tagIds.includes(tagId)
                        ? tagIds.filter((id) => id !== tagId)
                        : [...tagIds, tagId]
                      updateFilter('tagIds', newTagIds.join(','))
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {/* ビュー切り替え */}
            <div className="flex items-center border rounded-md p-0.5 bg-white">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => updateFilter('view', 'list')}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => updateFilter('view', 'grid')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="hidden sm:flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} className="h-8 text-xs">
                <Download className="h-3 w-3 mr-1" />
                CSV
              </Button>

              <a href="/api/consignments/import/template" download>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  テンプレート
                </Button>
              </a>

              <Button
                variant="outline"
                size="sm"
                onClick={handleImportClick}
                disabled={importing}
                className="h-8 text-xs"
              >
                <Upload className="h-3 w-3 mr-1" />
                {importing ? '取込中...' : 'インポート'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={!hasSelection}
                className="h-8 text-xs"
              >
                <Printer className="h-3 w-3 mr-1" />
                印刷
              </Button>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs sm:hidden">
                  <MoreHorizontal className="h-3.5 w-3.5 mr-1" />
                  その他
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-44 p-2">
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="h-8 text-xs justify-start"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    CSV
                  </Button>
                  <a href="/api/consignments/import/template" download>
                    <Button variant="outline" size="sm" className="h-8 text-xs w-full justify-start">
                      テンプレート
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleImportClick}
                    disabled={importing}
                    className="h-8 text-xs justify-start"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    {importing ? '取込中...' : 'インポート'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    disabled={!hasSelection}
                    className="h-8 text-xs justify-start"
                  >
                    <Printer className="h-3 w-3 mr-1" />
                    印刷
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Link href="/consignments/new">
              <Button size="sm" className="h-8 text-xs">+ 新規登録</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 一括操作ツールバー */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
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

      {/* 選択操作バー */}
      {hasSelection && (
        <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-md">
          <span className="text-sm text-blue-700">{selectedIds.size}件選択中</span>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            選択解除
          </Button>
          <Button variant="ghost" size="sm" onClick={selectAllFiltered} disabled={selectAllLoading}>
            {selectAllLoading ? '読込中...' : 'フィルタ結果全件選択'}
          </Button>
          <div className="flex-1" />
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            一括削除
          </Button>
        </div>
      )}

      {/* 一覧表示 */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        // グリッドビュー
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {consignments.map((consignment) => (
            <Link key={consignment.id} href={buildDetailHref(consignment.id)}>
              <div className={`border rounded-lg overflow-hidden hover:shadow-md transition-shadow ${consignment.isSold ? 'opacity-50' : ''}`}>
                <div className="aspect-square relative bg-gray-100">
                  {consignment.images && consignment.images[0] ? (
                    <Image
                      src={consignment.images[0].url}
                      alt={consignment.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                  {consignment.isSold && (
                    <div className="absolute top-2 right-2 bg-gray-600 text-white text-xs px-2 py-1 rounded">
                      販売済み
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium truncate">{consignment.name}</p>
                  <p className="text-sm text-gray-500 truncate">{consignment.manufacturer?.name || '-'}</p>
                  <p className="text-sm text-gray-500">定価: {consignment.listPrice ? formatPrice(consignment.listPrice.toString()) : '-'}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        // テーブルビュー
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allPageSelected}
                    onCheckedChange={togglePageSelection}
                  />
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('manufacturer')}>
                  メーカー {getSortIcon('manufacturer')}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('category')}>
                  品目 {getSortIcon('category')}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>
                  商品名 {getSortIcon('name')}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('specification')}>
                  仕様 {getSortIcon('specification')}
                </TableHead>
                <TableHead>サイズ</TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('quantity')}>
                  個数 {getSortIcon('quantity')}
                </TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('listPrice')}>
                  定価 {getSortIcon('listPrice')}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('location')}>
                  場所 {getSortIcon('location')}
                </TableHead>
                <TableHead>タグ</TableHead>
                {hasSelection && <TableHead className="w-10">詳細</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {consignments.map((consignment) => (
                <TableRow
                  key={consignment.id}
                  className={`cursor-pointer hover:bg-gray-50 ${consignment.isSold ? 'bg-gray-100 text-gray-400' : ''}`}
                  onClick={() => !hasSelection && router.push(buildDetailHref(consignment.id))}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(consignment.id)}
                      onCheckedChange={() => toggleSelection(consignment.id)}
                    />
                  </TableCell>
                  <TableCell className="max-w-[100px] truncate">{consignment.manufacturer?.name || '-'}</TableCell>
                  <TableCell className="max-w-[100px] truncate">{consignment.category?.name || '-'}</TableCell>
                  <TableCell className="max-w-[150px] truncate font-medium">{consignment.name}</TableCell>
                  <TableCell className="max-w-[120px] truncate">{consignment.specification || '-'}</TableCell>
                  <TableCell className="max-w-[100px] truncate">{consignment.size || '-'}</TableCell>
                  <TableCell className="text-right">{consignment.quantity}</TableCell>
                  <TableCell className="text-right">
                    {consignment.listPrice ? formatPrice(consignment.listPrice.toString()) : '-'}
                  </TableCell>
                  <TableCell className="max-w-[100px] truncate">{consignment.location?.name || '-'}</TableCell>
                  <TableCell className="max-w-[150px]">
                    <div className="flex flex-wrap gap-1">
                      {consignment.tags && consignment.tags.length > 0 ? (
                        consignment.tags.map((t) => (
                          <Badge key={t.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {t.tag?.name || ''}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </TableCell>
                  {hasSelection && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => router.push(buildDetailHref(consignment.id))}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ページネーション */}
      {renderPagination()}

      {/* 一括編集ダイアログ */}
      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        selectedCount={selectedIds.size}
        categories={categories}
        manufacturers={manufacturers}
        locations={locations}
        tags={tags}
        onSubmit={handleBulkEdit}
        isLoading={bulkOperationLoading}
      />

      {/* 一括削除確認ダイアログ */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>一括削除の確認</DialogTitle>
            <DialogDescription>
              {selectedIds.size}件の委託品を削除します。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkOperationLoading}
            >
              {bulkOperationLoading ? '削除中...' : '削除する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
