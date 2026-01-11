'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice } from '@/lib/utils'
import { PRINT_SELECTION_STORAGE_KEY } from '@/lib/constants'
import type { ProductSortField, ProductSortOrder, ProductWithRelations } from '@/lib/types'
import { ArrowLeft, FileDown, Printer } from 'lucide-react'

interface PrintSelectionPayload {
  productIds: string[]
  sortBy?: ProductSortField
  sortOrder?: ProductSortOrder
}

const ITEMS_PER_PAGE = 4

function chunkProducts(products: ProductWithRelations[], size: number) {
  const chunks: ProductWithRelations[][] = []
  for (let i = 0; i < products.length; i += size) {
    chunks.push(products.slice(i, i + size))
  }
  return chunks
}

export default function ProductPrintPage() {
  const router = useRouter()
  const [products, setProducts] = useState<ProductWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPrintData = async () => {
      try {
        const raw = sessionStorage.getItem(PRINT_SELECTION_STORAGE_KEY)
        if (!raw) {
          setError('印刷対象の商品が選択されていません')
          return
        }

        const payload = JSON.parse(raw) as PrintSelectionPayload
        sessionStorage.removeItem(PRINT_SELECTION_STORAGE_KEY)

        if (!payload.productIds || payload.productIds.length === 0) {
          setError('印刷対象の商品が選択されていません')
          return
        }

        const response = await fetch('/api/products/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error('印刷データの取得に失敗しました')
        }

        const data = await response.json()
        setProducts(data.products || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : '印刷データの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    loadPrintData()
  }, [])

  const pages = useMemo(() => chunkProducts(products, ITEMS_PER_PAGE), [products])

  const handlePrint = () => {
    window.print()
  }

  const handlePdf = () => {
    const previousTitle = document.title
    const dateStamp = new Date().toISOString().split('T')[0].replace(/-/g, '')
    document.title = `products_print_${dateStamp}`
    window.print()
    window.setTimeout(() => {
      document.title = previousTitle
    }, 1000)
  }

  return (
    <div className="space-y-4">
      <div className="print-hidden flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="h-8 text-xs w-full sm:w-auto"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            商品一覧へ戻る
          </Button>
          <div className="text-xs text-slate-500">
            A4サイズ・2列×2行（4件/ページ）
          </div>
          <div className="text-[11px] text-slate-400">
            PDF出力は印刷ダイアログから保存できます。
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handlePrint}
          >
            <Printer className="h-3 w-3 mr-1" />
            印刷
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handlePdf}
          >
            <FileDown className="h-3 w-3 mr-1" />
            PDF出力
          </Button>
        </div>
      </div>

      <div className="print-hidden sm:hidden text-xs text-slate-500">
        印刷とPDF出力はPCからご利用ください。
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-[480px] w-full" />
        </div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : products.length === 0 ? (
        <div className="text-sm text-slate-500">印刷対象の商品がありません。</div>
      ) : (
        <div className="space-y-8">
          {pages.map((page, pageIndex) => {
            return (
              <section
                key={`print-page-${pageIndex}`}
                className="print-page mx-auto w-full sm:w-[210mm] min-h-[297mm] bg-white border border-slate-200 shadow-sm p-[10mm]"
              >
                <div className="print-page-grid grid grid-cols-2 grid-rows-2 gap-4 h-full">
                  {page.map((product) => {
                    const imageUrl = product.images?.[0]?.url
                    const listPrice =
                      product.listPrice !== null && product.listPrice !== undefined
                        ? formatPrice(product.listPrice as string)
                        : '-'

                    return (
                      <div
                        key={product.id}
                        className="print-item flex flex-col border border-slate-300 rounded-sm overflow-hidden h-full"
                      >
                        <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center">
                          {imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400">No Image</span>
                          )}
                        </div>
                        <div className="flex-1 p-2 text-[10px] leading-snug">
                          <div className="text-[11px] font-semibold">{product.name}</div>
                          <div className="text-[10px] text-slate-600 mb-1">
                            {product.manufacturer?.name || '-'}
                          </div>
                          <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1 text-[10px]">
                            <span className="text-slate-500">仕様</span>
                            <span className="break-words whitespace-pre-wrap">
                              {product.specification || '-'}
                            </span>
                            <span className="text-slate-500">サイズ</span>
                            <span className="break-words whitespace-pre-wrap">
                              {product.size || '-'}
                            </span>
                            <span className="text-slate-500">張地/カラー</span>
                            <span className="break-words whitespace-pre-wrap">
                              {product.fabricColor || '-'}
                            </span>
                            <span className="text-slate-500">定価</span>
                            <span>{listPrice}</span>
                            <span className="text-slate-500">個数/単位</span>
                            <span>
                              {product.quantity}
                              {product.unit ? ` ${product.unit.name}` : ''}
                            </span>
                          </div>
                          <div className="mt-2 border-t border-slate-200 pt-1">
                            <span className="text-slate-500">備考: </span>
                            <span className="break-words whitespace-pre-wrap">
                              {product.notes || '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
