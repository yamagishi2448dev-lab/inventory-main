'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import type { ItemWithRelations } from '@/lib/types'
import { formatPrice } from '@/lib/utils'
import { ImageIcon } from 'lucide-react'

interface ItemGridViewProps {
    items: ItemWithRelations[]
    selectedItemIds?: Set<string>
    onSelectionChange?: (itemId: string) => void
    selectionActive?: boolean
    detailQuery?: string
    showItemType?: boolean
}

export function ItemGridView({
    items,
    selectedItemIds = new Set(),
    onSelectionChange,
    selectionActive = false,
    detailQuery = '',
    showItemType = false
}: ItemGridViewProps) {
    const router = useRouter()
    const buildDetailHref = (id: string) => {
        return detailQuery ? `/items/${id}?${detailQuery}` : `/items/${id}`
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-10 border rounded-lg bg-slate-50">
                <p className="text-muted-foreground">表示するアイテムがありません</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => {
                const isSelected = selectedItemIds.has(item.id)
                const isSold = item.isSold
                const isConsignment = item.itemType === 'CONSIGNMENT'
                return (
                    <Card
                        key={item.id}
                        className={`overflow-hidden flex flex-col h-full hover:shadow-md transition-all cursor-pointer ${
                            isSelected ? 'ring-2 ring-primary' : ''
                        } ${isSold ? 'opacity-60' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                            if (selectionActive && onSelectionChange) {
                                onSelectionChange(item.id)
                                return
                            }
                            router.push(buildDetailHref(item.id))
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                if (selectionActive && onSelectionChange) {
                                    onSelectionChange(item.id)
                                    return
                                }
                                router.push(buildDetailHref(item.id))
                            }
                        }}
                    >
                        <div className="aspect-square w-full bg-slate-100 relative flex items-center justify-center">
                            {/* チェックボックス */}
                            {onSelectionChange && (
                                <div
                                    className="absolute top-2 left-2 z-10 bg-white rounded p-1 shadow-sm"
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => onSelectionChange(item.id)}
                                        aria-label={`選択: ${item.name}`}
                                    />
                                </div>
                            )}

                            {item.images && item.images.length > 0 ? (
                                <Image
                                    src={item.images[0].url}
                                    alt={item.name}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="text-slate-300 flex flex-col items-center">
                                    <ImageIcon className="h-12 w-12 mb-2" />
                                    <span className="text-xs">No Image</span>
                                </div>
                            )}

                            {/* ステータスバッジ */}
                            <div className="absolute top-2 right-2 flex flex-col gap-1">
                                {showItemType && (
                                    <Badge
                                        variant={isConsignment ? 'secondary' : 'default'}
                                        className="text-[10px]"
                                    >
                                        {isConsignment ? '委託' : '商品'}
                                    </Badge>
                                )}
                                {isSold ? (
                                    <Badge variant="outline" className="bg-gray-500 text-white text-[10px] border-0">
                                        販売済み
                                    </Badge>
                                ) : item.quantity <= 0 && (
                                    <Badge variant="destructive" className="text-[10px]">
                                        在庫切れ
                                    </Badge>
                                )}
                            </div>
                        </div>

                    <CardContent className="p-4 flex-grow">
                        <div className="text-xs text-muted-foreground mb-1">
                            {item.manufacturer?.name || 'メーカー不明'}
                        </div>
                        <h3 className="font-semibold text-lg leading-tight mb-2 line-clamp-2" title={item.name}>
                            {item.name}
                        </h3>

                        <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                            <div>
                                <span className="text-muted-foreground text-xs block">品目</span>
                                <span className="truncate block">{item.category?.name || '-'}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground text-xs block">場所</span>
                                <span className="truncate block">{item.location?.name || '-'}</span>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="p-4 pt-0 border-t bg-slate-50/50 mt-auto">
                        <div className="w-full flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">個数</span>
                                <span className="font-mono font-bold text-slate-700">
                                    {item.quantity} <span className="text-xs font-normal">{item.unit?.name || '個'}</span>
                                </span>
                            </div>
                            {/* 原価（商品のみ表示） */}
                            {!isConsignment && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">原価</span>
                                    <span className="font-mono text-sm">
                                        {item.costPrice ? formatPrice(item.costPrice as string) : '-'}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">定価</span>
                                <span className="font-mono text-sm">
                                    {item.listPrice ? formatPrice(item.listPrice as string) : '-'}
                                </span>
                            </div>
                        </div>
                    </CardFooter>
                </Card>
                )
            })}
        </div>
    )
}
