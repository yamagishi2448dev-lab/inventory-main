'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/utils'
import type { ItemWithRelations } from '@/lib/types'

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [item, setItem] = useState<ItemWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [itemId, setItemId] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const returnQuery = searchParams.toString()
  const backHref = returnQuery ? `/items?${returnQuery}` : '/items'

  useEffect(() => {
    const initParams = async () => {
      const resolvedParams = await params
      setItemId(resolvedParams.id)
    }
    initParams()
  }, [params])

  useEffect(() => {
    if (!itemId) return

    const fetchItem = async () => {
      try {
        const response = await fetch(`/api/items/${itemId}`)

        if (!response.ok) {
          throw new Error('アイテムの取得に失敗しました')
        }

        const data = await response.json()
        setItem(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    fetchItem()
  }, [itemId])

  const handleDelete = async () => {
    if (!item || !itemId) return

    if (!confirm(`「${item.name}」を削除してもよろしいですか？`)) {
      return
    }

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('アイテムの削除に失敗しました')
      }

      alert('アイテムを削除しました')
      router.push('/items')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'アイテムの削除に失敗しました')
    }
  }

  // 販売済みトグル
  const handleSoldToggle = async (newSoldState: boolean) => {
    if (!item || !itemId) return

    const action = newSoldState ? '販売済みに' : '販売済みを解除'
    if (!confirm(`このアイテムを${action}しますか？`)) {
      return
    }

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isSold: newSoldState,
          soldAt: newSoldState ? new Date().toISOString() : null,
        }),
      })

      if (!response.ok) {
        throw new Error('販売済み状態の更新に失敗しました')
      }

      const updatedItem = await response.json()
      setItem(updatedItem.item || updatedItem)
    } catch (err) {
      alert(err instanceof Error ? err.message : '販売済み状態の更新に失敗しました')
    }
  }

  const getTypeLabel = () => {
    if (item?.itemType === 'PRODUCT') return '商品'
    if (item?.itemType === 'CONSIGNMENT') return '委託品'
    return 'アイテム'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">アイテム詳細</h1>
        </div>
        <div className="text-red-600">{error || 'アイテムが見つかりません'}</div>
        <Link href={backHref}>
          <Button variant="outline">アイテム一覧に戻る</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{getTypeLabel()}詳細</h1>
          <Badge variant={item.itemType === 'PRODUCT' ? 'default' : 'secondary'}>
            {getTypeLabel()}
          </Badge>
          {item.isSold && (
            <Badge variant="secondary" className="bg-gray-500 text-white">
              販売済み
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 px-3 py-1 border rounded-md bg-white">
            <Checkbox
              id="sold-checkbox"
              checked={item.isSold}
              onCheckedChange={(checked) => handleSoldToggle(checked === true)}
            />
            <label htmlFor="sold-checkbox" className="text-sm cursor-pointer">
              販売済み
            </label>
          </div>
          <Link href={returnQuery ? `/items/${item.id}/edit?${returnQuery}` : `/items/${item.id}/edit`}>
            <Button variant="outline">編集</Button>
          </Link>
          <Button variant="outline" onClick={handleDelete}>
            削除
          </Button>
          <Link href={backHref}>
            <Button variant="outline">戻る</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 画像セクション */}
        <Card>
          <CardHeader>
            <CardTitle>画像</CardTitle>
          </CardHeader>
          <CardContent>
            {item.images && item.images.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {item.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(image.url)}
                    className="relative aspect-square overflow-hidden rounded-lg border hover:opacity-80 transition-opacity"
                  >
                    <Image
                      src={image.url}
                      alt={`${item.name} - 画像 ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">画像がありません</p>
            )}
          </CardContent>
        </Card>

        {/* 基本情報セクション */}
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">SKU</p>
                <p className="font-mono">{item.sku}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{getTypeLabel()}名</p>
                <p className="font-medium">{item.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">メーカー</p>
                <p>{item.manufacturer?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">品目</p>
                <p>{item.category?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">仕様</p>
                <p>{item.specification || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">サイズ</p>
                <p>{item.size || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">張地/カラー</p>
                <p className="whitespace-pre-wrap">{item.fabricColor || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">個数</p>
                <p>{item.quantity} {item.unit?.name || '個'}</p>
              </div>
              {item.itemType === 'PRODUCT' && (
                <div>
                  <p className="text-sm text-gray-500">原価単価</p>
                  <p>{item.costPrice ? formatPrice(item.costPrice as string) : '-'}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">定価単価</p>
                <p>{item.listPrice ? formatPrice(item.listPrice as string) : '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">入荷年月</p>
                <p>{item.arrivalDate || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">場所</p>
                <p>{item.location?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">デザイナー</p>
                <p>{item.designer || '-'}</p>
              </div>
            </div>

            {/* タグ */}
            {item.tags && item.tags.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">タグ</p>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((itemTag) => (
                    <Badge key={itemTag.id} variant="secondary">
                      {itemTag.tag?.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 備考 */}
            {item.notes && (
              <div>
                <p className="text-sm text-gray-500">備考</p>
                <p className="whitespace-pre-wrap">{item.notes}</p>
              </div>
            )}

            {/* 販売情報 */}
            {item.isSold && item.soldAt && (
              <div>
                <p className="text-sm text-gray-500">販売日時</p>
                <p>{new Date(item.soldAt).toLocaleString('ja-JP')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 素材情報セクション */}
        {item.materials && item.materials.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>素材情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {item.materials.map((material) => (
                  <div key={material.id} className="border rounded-lg p-4">
                    <p className="font-medium mb-2">{material.materialType?.name}</p>
                    {material.description && (
                      <p className="text-sm text-gray-600 mb-2">{material.description}</p>
                    )}
                    {material.imageUrl && (
                      <div className="relative aspect-video overflow-hidden rounded">
                        <Image
                          src={material.imageUrl}
                          alt={material.materialType?.name || '素材画像'}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 画像拡大ダイアログ */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          {selectedImage && (
            <div className="relative aspect-square">
              <Image
                src={selectedImage}
                alt={item.name}
                fill
                className="object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
