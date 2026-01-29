'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import type { ProductWithRelations } from '@/lib/types'
import { ImageIcon } from 'lucide-react'

interface ProductGridViewProps {
    products: ProductWithRelations[]
    selectedProductIds?: Set<string>
    onSelectionChange?: (productId: string) => void
    selectionActive?: boolean
    detailQuery?: string
}

export function ProductGridView({
    products,
    selectedProductIds = new Set(),
    onSelectionChange,
    selectionActive = false,
    detailQuery = ''
}: ProductGridViewProps) {
    const router = useRouter()
    const buildDetailHref = (id: string) => {
        return detailQuery ? `/products/${id}?${detailQuery}` : `/products/${id}`
    }

    if (products.length === 0) {
        return (
            <div className="text-center py-10 border rounded-lg bg-slate-50">
                <p className="text-muted-foreground">表示する商品がありません</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => {
                const isSelected = selectedProductIds.has(product.id)
                const isSold = product.isSold  // v2.1追加
                return (
                    <Card
                        key={product.id}
                        className={`overflow-hidden flex flex-col h-full hover:shadow-md transition-all cursor-pointer ${
                            isSelected ? 'ring-2 ring-primary' : ''
                        } ${isSold ? 'opacity-60' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                            if (selectionActive && onSelectionChange) {
                                onSelectionChange(product.id)
                                return
                            }
                            router.push(buildDetailHref(product.id))
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                if (selectionActive && onSelectionChange) {
                                    onSelectionChange(product.id)
                                    return
                                }
                                router.push(buildDetailHref(product.id))
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
                                        onCheckedChange={() => onSelectionChange(product.id)}
                                        aria-label={`選択: ${product.name}`}
                                    />
                                </div>
                            )}

                            {product.images && product.images.length > 0 ? (
                                <Image
                                    src={product.images[0].url}
                                    alt={product.name}
                                    fill
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                                    className="object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="text-slate-300 flex flex-col items-center">
                                    <ImageIcon className="h-12 w-12 mb-2" />
                                    <span className="text-xs">No Image</span>
                                </div>
                            )}
                            {isSold ? (
                                <div className="absolute top-2 right-2 bg-gray-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                                    販売済み
                                </div>
                            ) : product.quantity <= 0 && (
                                <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                                    在庫切れ
                                </div>
                            )}
                        </div>

                    <CardContent className="p-4 flex-grow">
                        <div className="text-xs text-muted-foreground mb-1">
                            {product.manufacturer?.name || 'メーカー不明'}
                        </div>
                        <h3 className="font-semibold text-lg leading-tight mb-2 line-clamp-2" title={product.name}>
                            {product.name}
                        </h3>

                        <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                            <div>
                                <span className="text-muted-foreground text-xs block">品目</span>
                                <span className="truncate block">{product.category?.name || '-'}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground text-xs block">場所</span>
                                <span className="truncate block">{product.location?.name || '-'}</span>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="p-4 pt-0 border-t bg-slate-50/50 flex items-center justify-between mt-auto">
                        <div className="font-mono font-bold text-lg text-slate-700">
                            {product.quantity} <span className="text-xs font-normal text-muted-foreground">{product.unit?.name || '個'}</span>
                        </div>
                    </CardFooter>
                </Card>
                )
            })}
        </div>
    )
}
