'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
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
import { useFilters } from '@/lib/hooks/useFilters'
import { formatPrice } from '@/lib/utils'
import { DEFAULT_PAGE_SIZE, PRINT_SELECTION_STORAGE_KEY, PRODUCT_SELECTION_STORAGE_KEY } from '@/lib/constants'
import type { ProductWithRelations, PaginationData, QuantityMode, ProductSortField, ProductSortOrder } from '@/lib/types'
import { LayoutGrid, List, Download, RotateCcw, Filter, Search, X, Printer, Eye, Upload, MoreHorizontal } from 'lucide-react'
import { SortableHeader } from '@/components/shared/SortableHeader'
import { FilterDropdown } from '@/components/shared/FilterDropdown'
import { TagFilterDropdown } from '@/components/shared/TagFilterDropdown'

// 蜍慕噪繧､繝ｳ繝昴・繝茨ｼ亥・譛溘ヰ繝ｳ繝峨Ν繧ｵ繧､繧ｺ蜑頑ｸ幢ｼ・
const ProductGridView = dynamic(() => import('@/components/products/ProductGridView').then(mod => ({ default: mod.ProductGridView })), {
  loading: () => <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-96" />)}
  </div>,
})

const BulkActionsBar = dynamic(() => import('@/components/products/BulkActionsBar').then(mod => ({ default: mod.BulkActionsBar })), {
  ssr: false,
})

const BulkEditDialog = dynamic(() => import('@/components/products/BulkEditDialog').then(mod => ({ default: mod.BulkEditDialog })), {
  ssr: false,
})

// 繧ｽ繝ｼ繝医ヵ繧｣繝ｼ繝ｫ繝峨・蝙・
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

  // 驕ｸ謚樒憾諷狗ｮ｡逅・
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
  const [selectAllLoading, setSelectAllLoading] = useState(false)
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  // URL繝代Λ繝｡繝ｼ繧ｿ縺ｧ繝輔ぅ繝ｫ繧ｿ繝ｼ迥ｶ諷九ｒ邂｡逅・
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // 繝薙Η繝ｼ繝｢繝ｼ繝臥憾諷・(list | grid)
  const viewParam = searchParams.get('view')
  const resolvedViewMode: 'list' | 'grid' = viewParam === 'grid' ? 'grid' : 'list'
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(resolvedViewMode)

  // URL縺九ｉ繝輔ぅ繝ｫ繧ｿ繝ｼ蛟､繧貞叙蠕・
  const search = searchParams.get('search') || ''
  const categoryId = searchParams.get('categoryId') || ''
  const manufacturerId = searchParams.get('manufacturerId') || ''
  const locationId = searchParams.get('locationId') || ''
  // v2.2霑ｽ蜉: useMemo縺ｧ繝｡繝｢蛹悶＠縺ｦ辟｡髯舌Ν繝ｼ繝励ｒ髦ｲ縺・
  const tagIds = useMemo(
    () => searchParams.get('tagIds')?.split(',').filter(Boolean) || [],
    [searchParams]
  )
  const includeSold = searchParams.get('includeSold') === 'true'  // v2.1霑ｽ蜉
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

  // searchInput縺ｯ繝・ヰ繧ｦ繝ｳ繧ｹ逕ｨ縺ｫ邯ｭ謖・
  const [searchInput, setSearchInput] = useState(search)

  // 驕ｸ謚櫁い逕ｨ縺ｮ繝・・繧ｿ・・2.2繧ｫ繧ｹ繧ｿ繝繝輔ャ繧ｯ繧剃ｽｿ逕ｨ・・
  const { categories, manufacturers, locations, tags } = useFilters()

  // 繝輔ぅ繝ｫ繧ｿ繝ｼ縺後い繧ｯ繝・ぅ繝悶°縺ｩ縺・°
  const hasActiveFilters = !!(search || categoryId || manufacturerId || locationId || tagIds.length > 0 || sortBy || includeSold)

  // URL譖ｴ譁ｰ髢｢謨ｰ
  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // 繝輔ぅ繝ｫ繧ｿ繝ｼ螟画峩譎ゅ・繝壹・繧ｸ繧・縺ｫ繝ｪ繧ｻ繝・ヨ
    if (key !== 'page') {
      params.delete('page')
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  // 繧ｽ繝ｼ繝亥・繧頑崛縺磯未謨ｰ
  const toggleSort = useCallback((field: SortField) => {
    const params = new URLSearchParams(searchParams.toString())

    if (sortBy === field) {
      // 蜷後§繝輔ぅ繝ｼ繝ｫ繝峨・蝣ｴ蜷医・・ｺ上ｒ蛻・ｊ譖ｿ縺・
      if (sortOrder === 'asc') {
        params.set('sortOrder', 'desc')
      } else if (sortOrder === 'desc') {
        // 髯埼・・谺｡縺ｯ繧ｽ繝ｼ繝郁ｧ｣髯､
        params.delete('sortBy')
        params.delete('sortOrder')
      } else {
        params.set('sortOrder', 'asc')
      }
    } else {
      // 譁ｰ縺励＞繝輔ぅ繝ｼ繝ｫ繝峨・蝣ｴ蜷医∵・鬆・°繧蛾幕蟋・
      params.set('sortBy', field)
      params.set('sortOrder', 'asc')
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname, sortBy, sortOrder])

  // 讀懃ｴ｢螳溯｡鯉ｼ・00ms繝・ヰ繧ｦ繝ｳ繧ｹ・・
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        updateFilter('search', searchInput)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, search, updateFilter])

  // URL縺ｮsearch螟画峩譎ゅ↓searchInput繧貞酔譛・
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
      if (tagIds.length > 0) params.append('tagIds', tagIds.join(','))  // v2.2霑ｽ蜉
      if (includeSold) params.append('includeSold', 'true')  // v2.1霑ｽ蜉
      if (sortBy) params.append('sortBy', sortBy)
      if (sortOrder) params.append('sortOrder', sortOrder)
      params.append('view', resolvedViewMode)

      const response = await fetch(`/api/products?${params.toString()}`)

      if (!response.ok) {
        throw new Error('蝠・刀荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆')
      }

      const data = await response.json()
      setProducts(data.products)
      setPagination(data.pagination)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆')
    } finally {
      setLoading(false)
    }
  }, [search, categoryId, manufacturerId, locationId, tagIds, includeSold, sortBy, sortOrder, resolvedViewMode])

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
        throw new Error(data?.error || 'CSV繧､繝ｳ繝昴・繝医↓螟ｱ謨励＠縺ｾ縺励◆')
      }

      const errorCount = Array.isArray(data.errors) ? data.errors.length : 0
      let message = `繧､繝ｳ繝昴・繝亥ｮ御ｺ・ ${data.imported}莉ｶ`
      if (errorCount > 0) {
        const preview = data.errors
          .slice(0, 3)
          .map((err: { row: number; message: string }) => `陦・{err.row}: ${err.message}`)
          .join('\n')
        message += `\n繧ｨ繝ｩ繝ｼ: ${errorCount}莉ｶ\n${preview}`
      }
      alert(message)
      await fetchProducts(currentPage)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'CSV繧､繝ｳ繝昴・繝医↓螟ｱ謨励＠縺ｾ縺励◆')
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

  // 繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ髢｢騾｣縺ｮ繝上Φ繝峨Λ繝ｼ
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
      if (includeSold) params.append('includeSold', 'true')  // v2.1霑ｽ蜉
      if (sortBy) params.append('sortBy', sortBy)
      if (sortOrder) params.append('sortOrder', sortOrder)
      params.append('view', resolvedViewMode)

      const response = await fetch(`/api/products/ids?${params.toString()}`)

      if (!response.ok) {
        throw new Error('繝輔ぅ繝ｫ繧ｿ邨先棡縺ｮ荳諡ｬ驕ｸ謚槭↓螟ｱ謨励＠縺ｾ縺励◆')
      }

      const data = await response.json()
      setSelectedProductIds(new Set(data.productIds))
    } catch (err) {
      alert(err instanceof Error ? err.message : '繝輔ぅ繝ｫ繧ｿ邨先棡縺ｮ荳諡ｬ驕ｸ謚槭↓螟ｱ謨励＠縺ｾ縺励◆')
    } finally {
      setSelectAllLoading(false)
    }
  }

  const handleOpenPrintView = () => {
    if (!hasSelection) {
      alert('蜊ｰ蛻ｷ縺吶ｋ蝠・刀繧帝∈謚槭＠縺ｦ縺上□縺輔＞')
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
      alert('蜊ｰ蛻ｷ逕ｻ髱｢縺ｮ貅門ｙ縺ｫ螟ｱ謨励＠縺ｾ縺励◆')
    }
  }

  const handleClearSelection = useCallback(() => {
    setSelectedProductIds(new Set())
    sessionStorage.removeItem(PRODUCT_SELECTION_STORAGE_KEY)
  }, [])

  // 荳諡ｬ蜑企勁
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
        throw new Error('荳諡ｬ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆')
      }

      const data = await response.json()
      alert(data.message)
      setSelectedProductIds(new Set())
      setBulkDeleteOpen(false)
      fetchProducts(pagination.page)
    } catch (err) {
      alert(err instanceof Error ? err.message : '荳諡ｬ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆')
    } finally {
      setBulkOperationLoading(false)
    }
  }

  // 荳諡ｬ邱ｨ髮・
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
        throw new Error(error.error || '荳諡ｬ邱ｨ髮・↓螟ｱ謨励＠縺ｾ縺励◆')
      }

      const data = await response.json()
      alert(data.message)
      setSelectedProductIds(new Set())
      setBulkEditOpen(false)
      fetchProducts(pagination.page)
    } catch (err) {
      alert(err instanceof Error ? err.message : '荳諡ｬ邱ｨ髮・↓螟ｱ謨励＠縺ｾ縺励◆')
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


  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 繝倥ャ繝繝ｼ: 繧ｿ繧､繝医Ν縲∵､懃ｴ｢縲√い繧ｯ繧ｷ繝ｧ繝ｳ繝懊ち繝ｳ */}
      <div className="rounded-lg border bg-white/70 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            {/* Title removed for breadcrumb */}
            <p className="text-xs text-gray-500">{pagination.total}莉ｶ</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:flex-1 lg:justify-center">
            {/* 讀懃ｴ｢繝懊ャ繧ｯ繧ｹ */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="蝠・刀蜷阪∽ｻ墓ｧ倥〒讀懃ｴ｢..."
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

            {/* 雋ｩ螢ｲ貂医∩繧貞性繧繝医げ繝ｫ v2.1霑ｽ蜉 */}
            <div className="flex items-center gap-2 px-2 py-1 border rounded-md bg-white">
              <Checkbox
                id="include-sold"
                checked={includeSold}
                onCheckedChange={(checked) => updateFilter('includeSold', checked ? 'true' : '')}
              />
              <label htmlFor="include-sold" className="text-xs cursor-pointer whitespace-nowrap">
                雋ｩ螢ｲ貂医∩繧貞性繧
              </label>
            </div>

            {/* 繝輔ぅ繝ｫ繧ｿ繝ｼ繝ｪ繧ｻ繝・ヨ繝懊ち繝ｳ */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className="h-8 text-xs w-full sm:w-auto"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              繝ｪ繧ｻ繝・ヨ
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {/* 繝薙Η繝ｼ繝｢繝ｼ繝牙・譖ｿ */}
            <div className="flex items-center border rounded-md p-0.5 bg-white">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleViewModeChange('list')}
                title="繝ｪ繧ｹ繝郁｡ｨ遉ｺ"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleViewModeChange('grid')}
                title="蜀咏悄陦ｨ遉ｺ"
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
                蜊ｰ蛻ｷ
              </Button>
              <a href="/api/products/import/template" download>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  繝・Φ繝励Ξ繝ｼ繝・                </Button>
              </a>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleImportClick}
                disabled={importing}
              >
                <Upload className="h-3 w-3 mr-1" />
                {importing ? '蜿冶ｾｼ荳ｭ...' : '繧､繝ｳ繝昴・繝・'}
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
                  縺昴・莉・                </Button>
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
                    蜊ｰ蛻ｷ
                  </Button>
                  <a href="/api/products/import/template" download>
                    <Button variant="outline" size="sm" className="h-8 text-xs w-full justify-start">
                      繝・Φ繝励Ξ繝ｼ繝・                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs justify-start"
                    onClick={handleImportClick}
                    disabled={importing}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    {importing ? '蜿冶ｾｼ荳ｭ...' : '繧､繝ｳ繝昴・繝・'}
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
              <Button size="sm" className="h-8 text-xs">譁ｰ隕冗匳骭ｲ</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 荳諡ｬ謫堺ｽ懊ヤ繝ｼ繝ｫ繝舌・ */}
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
          驕ｸ謚・{selectedProductIds.size} / {pagination.total}莉ｶ
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
              ? '蜈ｨ莉ｶ驕ｸ謚樔ｸｭ...'
              : isAllFilteredSelected
                ? '蜈ｨ莉ｶ驕ｸ謚樊ｸ医∩'
                : '繝輔ぅ繝ｫ繧ｿ邨先棡繧貞・莉ｶ驕ｸ謚・'}
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
                        aria-label="蜈ｨ驕ｸ謚・"
                      />
                    </TableHead>
                    <TableHead className="py-1.5 px-2">
                      <div className="flex items-center gap-1">
                        <SortableHeader field="manufacturer" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort}>
                          <span className="text-xs font-medium">繝｡繝ｼ繧ｫ繝ｼ</span>
                        </SortableHeader>
                        <FilterDropdown
                          field="manufacturerId"
                          options={manufacturers}
                          currentValue={manufacturerId}
                          label="繝｡繝ｼ繧ｫ繝ｼ"
                          onValueChange={updateFilter}
                        />
                      </div>
                    </TableHead>
                    <TableHead className="py-1.5 px-2">
                      <div className="flex items-center gap-1">
                        <SortableHeader field="category" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort}>
                          <span className="text-xs font-medium">蜩∫岼</span>
                        </SortableHeader>
                        <FilterDropdown
                          field="categoryId"
                          options={categories}
                          currentValue={categoryId}
                          label="蜩∫岼"
                          onValueChange={updateFilter}
                        />
                      </div>
                    </TableHead>
                    <TableHead className="py-1.5 px-2">
                      <SortableHeader field="name" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort}>
                        <span className="text-xs font-medium">蝠・刀蜷・</span>
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="py-1.5 px-2">
                      <SortableHeader field="specification" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort}>
                        <span className="text-xs font-medium">莉墓ｧ・</span>
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="py-1.5 px-2">
                      <span className="text-xs font-medium">繧ｵ繧､繧ｺ</span>
                    </TableHead>
                    <TableHead className="py-1.5 px-2 text-right">
                      <SortableHeader field="quantity" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} className="justify-end">
                        <span className="text-xs font-medium">蛟区焚</span>
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="py-1.5 px-2 text-right">
                      <SortableHeader field="costPrice" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} className="justify-end">
                        <span className="text-xs font-medium">蜴滉ｾ｡蜊倅ｾ｡</span>
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="py-1.5 px-2">
                      <div className="flex items-center gap-1">
                        <SortableHeader field="location" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort}>
                          <span className="text-xs font-medium">蝣ｴ謇</span>
                        </SortableHeader>
                        <FilterDropdown
                          field="locationId"
                          options={locations}
                          currentValue={locationId}
                          label="蝣ｴ謇"
                          onValueChange={updateFilter}
                        />
                      </div>
                    </TableHead>
                    {/* v2.2霑ｽ蜉: 繧ｿ繧ｰ蛻・*/}
                    <TableHead className="py-1.5 px-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium">繧ｿ繧ｰ</span>
                        <TagFilterDropdown
                          tags={tags}
                          selectedTagIds={tagIds}
                          onTagsChange={(newTagIds) => updateFilter('tagIds', newTagIds.join(','))}
                        />
                      </div>
                    </TableHead>
                    {/* v2.1霑ｽ蜉: 驕ｸ謚槭Δ繝ｼ繝画凾縺ｮ隧ｳ邏ｰ繝懊ち繝ｳ蛻・*/}
                    {hasSelection && (
                      <TableHead className="w-12 py-1.5 px-2">
                        <span className="text-xs font-medium">隧ｳ邏ｰ</span>
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={hasSelection ? 11 : 10} className="text-xs py-4 px-2 text-center text-gray-500">
                        蝠・刀縺檎匳骭ｲ縺輔ｌ縺ｦ縺・∪縺帙ｓ
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => {
                      const isSelected = selectedProductIds.has(product.id)
                      const isSold = product.isSold  // v2.1霑ｽ蜉
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
                                aria-label={`驕ｸ謚・ ${product.name}`}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-1 px-2">{product.manufacturer?.name || '-'}</TableCell>
                          <TableCell className="text-xs py-1 px-2">{product.category?.name || '-'}</TableCell>
                          <TableCell className={`text-xs py-1 px-2 max-w-[180px] truncate ${isSold ? '' : 'font-medium'}`}>
                            {product.name}
                            {isSold && <span className="ml-1 text-[10px] text-gray-400">(雋ｩ螢ｲ貂・)</span>}
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
                          {/* v2.2霑ｽ蜉: 繧ｿ繧ｰ蛻・*/}
                          <TableCell className="text-xs py-1 px-2">
                            <div className="flex flex-wrap gap-1">
                              {product.tags && product.tags.length > 0 ? (
                                product.tags.map((productTag) => (
                                  <Badge key={productTag.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {productTag.tag?.name}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                          </TableCell>
                          {/* v2.1霑ｽ蜉: 驕ｸ謚槭Δ繝ｼ繝画凾縺ｮ隧ｳ邏ｰ繝懊ち繝ｳ */}
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

          {/* 繝壹・繧ｸ繝阪・繧ｷ繝ｧ繝ｳ */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                蜑阪∈
              </Button>
              <span className="text-xs">
                {pagination.page} / {pagination.totalPages} 繝壹・繧ｸ
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                谺｡縺ｸ
              </Button>
            </div>
          )}
        </>
      )}

      {/* 荳諡ｬ邱ｨ髮・ム繧､繧｢繝ｭ繧ｰ */}
      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        selectedCount={selectedProductIds.size}
        categories={categories}
        manufacturers={manufacturers}
        locations={locations}
        tags={tags}
        onSubmit={handleBulkEdit}
        isLoading={bulkOperationLoading}
      />

      {/* 荳諡ｬ蜑企勁遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>蝠・刀繧剃ｸ諡ｬ蜑企勁</DialogTitle>
            <DialogDescription>
              驕ｸ謚槭＠縺毬{selectedProductIds.size}莉ｶ縺ｮ蝠・刀繧貞炎髯､縺励※繧ゅｈ繧阪＠縺・〒縺吶°・・              <br />
              縺薙・謫堺ｽ懊・蜿悶ｊ豸医○縺ｾ縺帙ｓ縲・            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteOpen(false)}
              disabled={bulkOperationLoading}
            >
              繧ｭ繝｣繝ｳ繧ｻ繝ｫ
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkOperationLoading}
            >
              {bulkOperationLoading ? '蜑企勁荳ｭ...' : '蜑企勁'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

