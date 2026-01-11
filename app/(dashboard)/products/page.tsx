'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
import { useFilters } from '@/lib/hooks/useFilters'
import { formatPrice } from '@/lib/utils'
import { DEFAULT_PAGE_SIZE, PRINT_SELECTION_STORAGE_KEY, PRODUCT_SELECTION_STORAGE_KEY } from '@/lib/constants'
import type { ProductWithRelations, PaginationData, QuantityMode, ProductSortField, ProductSortOrder } from '@/lib/types'
import { LayoutGrid, List, Download, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, Filter, Search, X, Printer, Eye, Upload, MoreHorizontal } from 'lucide-react'
import { ProductGridView } from '@/components/products/ProductGridView'
import { BulkActionsBar } from '@/components/products/BulkActionsBar'
import { BulkEditDialog } from '@/components/products/BulkEditDialog'

// ソートフィールドの型
type SortField = Exclude<ProductSortField, 'createdAt'>
type SortOrder = ProductSortOrder

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithRelations[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 選択状態管理
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
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
  const includeSold = searchParams.get('includeSold') === 'true'  // v2.1追加
  const sortBy = (searchParams.get('sortBy') || '') as SortField | ''
  const sortOrder = (searchParams.get('sortOrder') || '') as SortOrder | ''
  const currentPage = Number(searchParams.get('page')) || 1
  const detailQuery = searchParams.toString()
  const buildDetailHref = useCallback((id: string) => {
    return detailQuery ? `/products/${id}?${detailQuery}` : `/products/${id}`
  }, [detailQuery])

  useEffect(() => {
    setViewMode(resolvedViewMode)
  }, [resolvedViewMode])

  // searchInputはデバウンス用に維持
  const [searchInput, setSearchInput] = useState(search)

  // 選択肢用のデータ（v2.0カスタムフックを使用）
  const { categories, manufacturers, locations } = useFilters()

  // フィルターがアクティブかどうか
  const hasActiveFilters = !!(search || categoryId || manufacturerId || locationId || sortBy || includeSold)

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

  // ソート切り替え関数
  const toggleSort = useCallback((field: SortField) => {
    const params = new URLSearchParams(searchParams.toString())

    if (sortBy === field) {
      // 同じフィールドの場合、順序を切り替え
      if (sortOrder === 'asc') {
        params.set('sortOrder', 'desc')
      } else if (sortOrder === 'desc') {
        // 降順の次はソート解除
        params.delete('sortBy')
        params.delete('sortOrder')
      } else {
        params.set('sortOrder', 'asc')
      }
    } else {
      // 新しいフィールドの場合、昇順から開始
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

  const fetchProducts = useCallback(async (page: number = 1) => {
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
      if (includeSold) params.append('includeSold', 'true')  // v2.1追加
      if (sortBy) params.append('sortBy', sortBy)
      if (sortOrder) params.append('sortOrder', sortOrder)

      const response = await fetch(`/api/products?${params.toString()}`)

      if (!response.ok) {
        throw new Error('商品一覧の取得に失敗しました')
      }

      const data = await response.json()
      setProducts(data.products)
      setPagination(data.pagination)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [search, categoryId, manufacturerId, locationId, includeSold, sortBy, sortOrder])

  useEffect(() => {
    fetchProducts(currentPage)
  }, [fetchProducts, currentPage])

  useEffect(() => {
    const rawSelection = sessionStorage.getItem(PRODUCT_SELECTION_STORAGE_KEY)
    if (!rawSelection) {
      return
    }

    try {
      const savedIds = JSON.parse(rawSelection)
      if (Array.isArray(savedIds)) {
        setSelectedProductIds(new Set(savedIds))
      }
    } catch (error) {
      sessionStorage.removeItem(PRODUCT_SELECTION_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    const ids = Array.from(selectedProductIds)
    if (ids.length === 0) {
      sessionStorage.removeItem(PRODUCT_SELECTION_STORAGE_KEY)
      return
    }
    sessionStorage.setItem(PRODUCT_SELECTION_STORAGE_KEY, JSON.stringify(ids))
  }, [selectedProductIds])

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

      const response = await fetch('/api/products/import', {
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
      await fetchProducts(currentPage)
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

  const isAllPageSelected = products.length > 0 && products.every((product) => selectedProductIds.has(product.id))
  const isSomePageSelected = products.some((product) => selectedProductIds.has(product.id))
  const hasSelection = selectedProductIds.size > 0
  const isAllFilteredSelected = pagination.total > 0 && selectedProductIds.size === pagination.total

  // チェックボックス関連のハンドラー
  const handleSelectAll = () => {
    const newSelection = new Set(selectedProductIds)

    if (isAllPageSelected) {
      products.forEach((product) => newSelection.delete(product.id))
    } else {
      products.forEach((product) => newSelection.add(product.id))
    }

    setSelectedProductIds(newSelection)
  }

  const handleSelectProduct = (productId: string) => {
    const newSelection = new Set(selectedProductIds)
    if (newSelection.has(productId)) {
      newSelection.delete(productId)
    } else {
      newSelection.add(productId)
    }
    setSelectedProductIds(newSelection)
  }

  const handleSelectAllFiltered = async () => {
    try {
      setSelectAllLoading(true)
      const params = new URLSearchParams()

      if (search) params.append('search', search)
      if (categoryId) params.append('categoryId', categoryId)
      if (manufacturerId) params.append('manufacturerId', manufacturerId)
      if (locationId) params.append('locationId', locationId)
      if (includeSold) params.append('includeSold', 'true')  // v2.1追加
      if (sortBy) params.append('sortBy', sortBy)
      if (sortOrder) params.append('sortOrder', sortOrder)

      const response = await fetch(`/api/products/ids?${params.toString()}`)

      if (!response.ok) {
        throw new Error('フィルタ結果の一括選択に失敗しました')
      }

      const data = await response.json()
      setSelectedProductIds(new Set(data.productIds))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'フィルタ結果の一括選択に失敗しました')
    } finally {
      setSelectAllLoading(false)
    }
  }

  const handleOpenPrintView = () => {
    if (!hasSelection) {
      alert('印刷する商品を選択してください')
      return
    }

    const payload = {
      productIds: Array.from(selectedProductIds),
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
    }

    try {
      sessionStorage.setItem(PRINT_SELECTION_STORAGE_KEY, JSON.stringify(payload))
      router.push('/products/print')
    } catch (err) {
      alert('印刷画面の準備に失敗しました')
    }
  }

  const handleClearSelection = useCallback(() => {
    setSelectedProductIds(new Set())
    sessionStorage.removeItem(PRODUCT_SELECTION_STORAGE_KEY)
  }, [])

  // 一括削除
  const handleBulkDelete = async () => {
    if (selectedProductIds.size === 0) return

    try {
      setBulkOperationLoading(true)
      const response = await fetch('/api/products/bulk/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productIds: Array.from(selectedProductIds),
        }),
      })

      if (!response.ok) {
        throw new Error('一括削除に失敗しました')
      }

      const data = await response.json()
      alert(data.message)
      setSelectedProductIds(new Set())
      setBulkDeleteOpen(false)
      fetchProducts(pagination.page)
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
    quantity?: {
      mode: QuantityMode
      value: number
    }
  }) => {
    if (selectedProductIds.size === 0) return

    try {
      setBulkOperationLoading(true)
      const response = await fetch('/api/products/bulk/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productIds: Array.from(selectedProductIds),
          updates,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '一括編集に失敗しました')
      }

      const data = await response.json()
      alert(data.message)
      setSelectedProductIds(new Set())
      setBulkEditOpen(false)
      fetchProducts(pagination.page)
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
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [router, pathname, viewMode, handleClearSelection])

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

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`p-0.5 rounded hover:bg-gray-200 ${currentValue ? 'text-blue-600' : 'text-gray-400'}`}
            title={`${label}でフィルター`}
          >
            <Filter className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-1 max-h-60 overflow-y-auto">
            <button
              onClick={() => {
                updateFilter(field, '')
                setOpen(false)
              }}
              className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 ${!currentValue ? 'bg-blue-50 text-blue-600' : ''}`}
            >
              すべて
            </button>
            {options.map((option) => (
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
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">商品一覧</h1>
        </div>
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー: タイトル、検索、アクションボタン */}
      <div className="rounded-lg border bg-white/70 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold whitespace-nowrap">商品一覧</h1>
            <p className="text-xs text-gray-500">{pagination.total}件</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:flex-1 lg:justify-center">
            {/* 検索ボックス */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="商品名、SKU、仕様で検索..."
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

            {/* 販売済みを含むトグル v2.1追加 */}
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

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {/* ビューモード切替 */}
            <div className="flex items-center border rounded-md p-0.5 bg-white">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleViewModeChange('list')}
                title="リスト表示"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleViewModeChange('grid')}
                title="写真表示"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="hidden sm:flex flex-wrap items-center gap-2">
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
              <a href="/api/products/import/template" download>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  テンプレート
                </Button>
              </a>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleImportClick}
                disabled={importing}
              >
                <Upload className="h-3 w-3 mr-1" />
                {importing ? '取込中...' : 'インポート'}
              </Button>
              <a href="/api/products/export" download>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Download className="h-3 w-3 mr-1" />
                  CSV
                </Button>
              </a>
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
                    className="h-8 text-xs justify-start"
                    onClick={handleOpenPrintView}
                    disabled={!hasSelection}
                  >
                    <Printer className="h-3 w-3 mr-1" />
                    印刷
                  </Button>
                  <a href="/api/products/import/template" download>
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
                  <a href="/api/products/export" download>
                    <Button variant="outline" size="sm" className="h-8 text-xs w-full justify-start">
                      <Download className="h-3 w-3 mr-1" />
                      CSV
                    </Button>
                  </a>
                </div>
              </PopoverContent>
            </Popover>

            <Link href="/products/new">
              <Button size="sm" className="h-8 text-xs">新規登録</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 一括操作ツールバー */}
      <BulkActionsBar
        selectedCount={selectedProductIds.size}
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
          選択 {selectedProductIds.size} / {pagination.total}件
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
                    <TableHead className="py-1.5 px-2">
                      <div className="flex items-center gap-1">
                        <SortableHeader field="manufacturer">
                          <span className="text-xs font-medium">メーカー</span>
                        </SortableHeader>
                        <FilterDropdown
                          field="manufacturerId"
                          options={manufacturers}
                          currentValue={manufacturerId}
                          label="メーカー"
                        />
                      </div>
                    </TableHead>
                    <TableHead className="py-1.5 px-2">
                      <div className="flex items-center gap-1">
                        <SortableHeader field="category">
                          <span className="text-xs font-medium">品目</span>
                        </SortableHeader>
                        <FilterDropdown
                          field="categoryId"
                          options={categories}
                          currentValue={categoryId}
                          label="品目"
                        />
                      </div>
                    </TableHead>
                    <TableHead className="py-1.5 px-2">
                      <SortableHeader field="name">
                        <span className="text-xs font-medium">商品名</span>
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
                    <TableHead className="py-1.5 px-2 text-right">
                      <SortableHeader field="costPrice" className="justify-end">
                        <span className="text-xs font-medium">原価単価</span>
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="py-1.5 px-2">
                      <div className="flex items-center gap-1">
                        <SortableHeader field="location">
                          <span className="text-xs font-medium">場所</span>
                        </SortableHeader>
                        <FilterDropdown
                          field="locationId"
                          options={locations}
                          currentValue={locationId}
                          label="場所"
                        />
                      </div>
                    </TableHead>
                    {/* v2.1追加: 選択モード時の詳細ボタン列 */}
                    {hasSelection && (
                      <TableHead className="w-12 py-1.5 px-2">
                        <span className="text-xs font-medium">詳細</span>
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={hasSelection ? 10 : 9} className="text-xs py-4 px-2 text-center text-gray-500">
                        商品が登録されていません
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => {
                      const isSelected = selectedProductIds.has(product.id)
                      const isSold = product.isSold  // v2.1追加
                      return (
                        <TableRow
                          key={product.id}
                          className={`${isSelected ? 'bg-blue-50/60' : isSold ? 'bg-gray-100' : ''} ${isSold ? 'text-gray-400' : ''} cursor-pointer transition-colors hover:bg-blue-50/40 hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.2)]`}
                          onClick={() => {
                            if (hasSelection) {
                              handleSelectProduct(product.id)
                              return
                            }
                            router.push(buildDetailHref(product.id))
                          }}
                        >
                          <TableCell className="py-1 px-2">
                            <div onClick={(event) => event.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleSelectProduct(product.id)}
                                aria-label={`選択: ${product.name}`}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-1 px-2">{product.manufacturer?.name || '-'}</TableCell>
                          <TableCell className="text-xs py-1 px-2">{product.category?.name || '-'}</TableCell>
                          <TableCell className={`text-xs py-1 px-2 max-w-[180px] truncate ${isSold ? '' : 'font-medium'}`}>
                            {product.name}
                            {isSold && <span className="ml-1 text-[10px] text-gray-400">(販売済)</span>}
                          </TableCell>
                          <TableCell className="text-xs py-1 px-2 max-w-[120px] truncate">
                            {product.specification || '-'}
                          </TableCell>
                          <TableCell className="text-xs py-1 px-2 max-w-[120px] truncate">
                            {product.size || '-'}
                          </TableCell>
                          <TableCell className="text-xs py-1 px-2 text-right">
                            {product.quantity}
                            {product.unit ? ` ${product.unit.name}` : ''}
                          </TableCell>
                          <TableCell className="text-xs py-1 px-2 text-right">
                            {formatPrice(product.costPrice as string)}
                          </TableCell>
                          <TableCell className="text-xs py-1 px-2">{product.location?.name || '-'}</TableCell>
                          {/* v2.1追加: 選択モード時の詳細ボタン */}
                          {hasSelection && (
                            <TableCell className="py-1 px-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(buildDetailHref(product.id))
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
            <ProductGridView
              products={products}
              selectedProductIds={selectedProductIds}
              onSelectionChange={handleSelectProduct}
              selectionActive={hasSelection}
              detailQuery={detailQuery}
            />
          )}

          {/* ページネーション */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                前へ
              </Button>
              <span className="text-xs">
                {pagination.page} / {pagination.totalPages} ページ
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                次へ
              </Button>
            </div>
          )}
        </>
      )}

      {/* 一括編集ダイアログ */}
      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        selectedCount={selectedProductIds.size}
        categories={categories}
        manufacturers={manufacturers}
        locations={locations}
        onSubmit={handleBulkEdit}
        isLoading={bulkOperationLoading}
      />

      {/* 一括削除確認ダイアログ */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>商品を一括削除</DialogTitle>
            <DialogDescription>
              選択した{selectedProductIds.size}件の商品を削除してもよろしいですか？
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
