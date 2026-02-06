'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice } from '@/lib/utils'
import { PRINT_SELECTION_STORAGE_KEY } from '@/lib/constants'
import { ArrowLeft, FileDown, Printer } from 'lucide-react'

interface PrintItem {
  id: string
  sku: string
  itemType: string
  name: string
  manufacturer: string
  specification: string
  fabricColor: string
  listPrice: string
  quantity: number
  unit: string
  notes: string
  imageUrl: string
}

interface PrintSelectionPayload {
  itemIds: string[]
  sortBy?: string
  sortOrder?: string
}

const ITEMS_PER_PAGE = 4

function chunkItems(items: PrintItem[], size: number) {
  const chunks: PrintItem[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

export default function ItemPrintPage() {
  const router = useRouter()
  const [items, setItems] = useState<PrintItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPrintData = async () => {
      try {
        const raw = sessionStorage.getItem(PRINT_SELECTION_STORAGE_KEY)
        if (!raw) {
          setError('印刷対象のアイテムが選択されていません')
          return
        }

        const payload = JSON.parse(raw) as PrintSelectionPayload
        sessionStorage.removeItem(PRINT_SELECTION_STORAGE_KEY)

        if (!payload.itemIds || payload.itemIds.length === 0) {
          setError('印刷対象のアイテムが選択されていません')
          return
        }

        const response = await fetch(`/api/items/print?ids=${payload.itemIds.join(',')}`)

        if (!response.ok) {
          throw new Error('印刷データの取得に失敗しました')
        }

        const data = await response.json()
        setItems(data.items || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : '印刷データの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    loadPrintData()
  }, [])

  const pages = useMemo(() => chunkItems(items, ITEMS_PER_PAGE), [items])

  const handlePrint = () => {
    window.print()
  }

  const handlePdf = () => {
    const previousTitle = document.title
    const dateStamp = new Date().toISOString().split('T')[0].replace(/-/g, '')
    document.title = `items_print_${dateStamp}`
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
            一覧へ戻る
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
      ) : items.length === 0 ? (
        <div className="text-sm text-slate-500">印刷対象のアイテムがありません。</div>
      ) : (
        <div className="space-y-8">
          {pages.map((page, pageIndex) => {
            return (
              <section
                key={`print-page-${pageIndex}`}
                className="print-page mx-auto w-full sm:w-[210mm] min-h-[297mm] bg-white border border-slate-200 shadow-sm p-[10mm]"
              >
                <div className="print-page-grid grid grid-cols-2 grid-rows-2 gap-4 h-full">
                  {page.map((item) => {
                    const listPrice = item.listPrice
                      ? formatPrice(item.listPrice)
                      : '-'

                    return (
                      <div
                        key={item.id}
                        className="print-item flex flex-col border border-slate-300 rounded-sm overflow-hidden h-full"
                      >
                        <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400">No Image</span>
                          )}
                        </div>
                        <div className="flex-1 p-2 text-[10px] leading-snug">
                          <div className="text-[11px] font-semibold">{item.name}</div>
                          <div className="text-[10px] text-slate-600 mb-1">
                            {item.manufacturer || '-'}
                          </div>
                          <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1 text-[10px]">
                            <span className="text-slate-500">仕様</span>
                            <span className="break-words whitespace-pre-wrap">
                              {item.specification || '-'}
                            </span>
                            <span className="text-slate-500">張地/カラー</span>
                            <span className="break-words whitespace-pre-wrap">
                              {item.fabricColor || '-'}
                            </span>
                            <span className="text-slate-500">定価</span>
                            <span>{listPrice}</span>
                            <span className="text-slate-500">個数/単位</span>
                            <span>
                              {item.quantity}
                              {item.unit ? ` ${item.unit}` : ''}
                            </span>
                          </div>
                          <div className="mt-2 border-t border-slate-200 pt-1">
                            <span className="text-slate-500">備考: </span>
                            <span className="break-words whitespace-pre-wrap">
                              {item.notes || '-'}
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
