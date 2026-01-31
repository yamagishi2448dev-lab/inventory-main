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

// v2.1 Product type
interface ProductMaterial {
  id: string
  materialTypeId: string
  materialType: { id: string; name: string }
  description: string | null
  imageUrl: string | null
  order: number
}

interface Product {
  id: string
  sku: string
  name: string
  manufacturer: { id: string; name: string } | null
  category: { id: string; name: string } | null
  specification: string | null
  size: string | null  // v2.1追加
  fabricColor: string | null
  quantity: number
  unit: { id: string; name: string } | null
  costPrice: string
  listPrice: string | null
  arrivalDate: string | null
  location: { id: string; name: string } | null
  designer: string | null  // v2.3追加
  notes: string | null
  isSold: boolean  // v2.1追加
  soldAt: string | null  // v2.1追加
  images: { id: string; url: string; order: number }[]
  materials?: ProductMaterial[]  // v2.1追加
  tags?: { id: string; tag: { id: string; name: string } }[]  // v2.2追加
  totalCost: string
  createdAt: string
  updatedAt: string
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [productId, setProductId] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const returnQuery = searchParams.toString()
  const backHref = returnQuery ? `/products?${returnQuery}` : '/products'

  useEffect(() => {
    const initParams = async () => {
      const resolvedParams = await params
      setProductId(resolvedParams.id)
    }
    initParams()
  }, [params])

  useEffect(() => {
    if (!productId) return

    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${productId}`)

        if (!response.ok) {
          throw new Error('商品の取得に失敗しました')
        }

        const data = await response.json()
        setProduct(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  const handleDelete = async () => {
    if (!product || !productId) return

    if (!confirm(`「${product.name}」を削除してもよろしいですか？`)) {
      return
    }

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('商品の削除に失敗しました')
      }

      alert('商品を削除しました')
      router.push('/products')
    } catch (err) {
      alert(err instanceof Error ? err.message : '商品の削除に失敗しました')
    }
  }

  // 販売済みトグル
  const handleSoldToggle = async (newSoldState: boolean) => {
    if (!product || !productId) return

    const action = newSoldState ? '販売済みに' : '販売済みを解除'
    if (!confirm(`この商品を${action}しますか？`)) {
      return
    }

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...product,
          isSold: newSoldState,
          soldAt: newSoldState ? new Date().toISOString() : null,
        }),
      })

      if (!response.ok) {
        throw new Error('販売済み状態の更新に失敗しました')
      }

      const updatedProduct = await response.json()
      setProduct(updatedProduct.product || updatedProduct)
    } catch (err) {
      alert(err instanceof Error ? err.message : '販売済み状態の更新に失敗しました')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">商品詳細</h1>
        </div>
        <div className="text-red-600">{error || '商品が見つかりません'}</div>
        <Link href={backHref}>
          <Button variant="outline">商品一覧に戻る</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">商品詳細</h1>
          {product.isSold && (
            <Badge variant="secondary" className="bg-gray-500 text-white">
              販売済み
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 px-3 py-1 border rounded-md bg-white">
            <Checkbox
              id="sold-checkbox"
              checked={product.isSold}
              onCheckedChange={(checked) => handleSoldToggle(checked === true)}
            />
            <label htmlFor="sold-checkbox" className="text-sm cursor-pointer">
              販売済み
            </label>
          </div>
          <Link href={returnQuery ? `/products/${product.id}/edit?${returnQuery}` : `/products/${product.id}/edit`}>
            <Button variant="outline">編集</Button>
          </Link>
          <Button variant="outline" onClick={handleDelete}>
            削除
          </Button>
          <Link href={backHref}>
            <Button variant="outline">一覧に戻る</Button>
          </Link>
        </div>
      </div>

      {product.images && product.images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>商品画像</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {product.images
                .sort((a, b) => a.order - b.order)
                .map((image, index) => (
                  <div
                    key={image.id}
                    className="relative aspect-square border rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedImage(image.url)}
                  >
                    <Image
                      src={image.url}
                      alt={`${product.name} - 画像 ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />
                    {index === 0 && (
                      <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs px-2 py-1">
                        メイン
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* v2.1追加: 素材情報 */}
      {product.materials && product.materials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>素材情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {product.materials
                .sort((a, b) => a.order - b.order)
                .map((material) => (
                  <div
                    key={material.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{material.materialType.name}</Badge>
                    </div>
                    {material.description && (
                      <p className="text-sm text-gray-600">{material.description}</p>
                    )}
                    {material.imageUrl && (
                      <div
                        className="relative aspect-square border rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedImage(material.imageUrl!)}
                      >
                        <Image
                          src={material.imageUrl}
                          alt={`${material.materialType.name}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-500">SKU</div>
              <div className="font-medium font-mono">{product.sku}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">商品名</div>
              <div className="font-medium">{product.name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">メーカー</div>
              <div className="font-medium">{product.manufacturer?.name || '未設定'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">品目</div>
              <div className="font-medium">{product.category?.name || '未設定'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">場所</div>
              <div className="font-medium">{product.location?.name || '未設定'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">入荷年月</div>
              <div className="font-medium">{product.arrivalDate || '未設定'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">デザイナー</div>
              <div className="font-medium">{product.designer || '未設定'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">タグ</div>
              <div className="font-medium flex flex-wrap gap-1 mt-1">
                {product.tags && product.tags.length > 0 ? (
                  product.tags.map((productTag) => (
                    <Badge key={productTag.id} variant="secondary">
                      {productTag.tag?.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-gray-400">未設定</span>
                )}
              </div>
            </div>
          </div>

          {product.specification && (
            <div>
              <div className="text-sm text-gray-500">仕様</div>
              <div className="mt-1 whitespace-pre-wrap">{product.specification}</div>
            </div>
          )}

          {product.size && (
            <div>
              <div className="text-sm text-gray-500">サイズ</div>
              <div className="mt-1">{product.size}</div>
            </div>
          )}

          {product.fabricColor && (
            <div>
              <div className="text-sm text-gray-500">張地/カラー</div>
              <div className="mt-1 whitespace-pre-wrap">{product.fabricColor}</div>
            </div>
          )}

          {product.isSold && product.soldAt && (
            <div>
              <div className="text-sm text-gray-500">販売済み日時</div>
              <div className="mt-1 text-gray-600">
                {new Date(product.soldAt).toLocaleString('ja-JP')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>数量・価格情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">個数</div>
              <div className="font-medium text-lg">
                {product.quantity} {product.unit?.name || ''}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">原価単価</div>
              <div className="font-medium text-lg">{formatPrice(product.costPrice)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">定価単価</div>
              <div className="font-medium text-lg">
                {product.listPrice ? formatPrice(product.listPrice) : '未設定'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">原価合計</div>
              <div className="font-medium text-lg text-blue-600">
                {formatPrice(product.totalCost)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {product.notes && (
        <Card>
          <CardHeader>
            <CardTitle>備考</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap">{product.notes}</div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>システム情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <div className="text-sm text-gray-500">作成日時</div>
            <div className="text-sm">
              {new Date(product.createdAt).toLocaleString('ja-JP')}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">更新日時</div>
            <div className="text-sm">
              {new Date(product.updatedAt).toLocaleString('ja-JP')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 画像拡大モーダル */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          {selectedImage && (
            <div className="relative w-full h-[600px]">
              <Image
                src={selectedImage}
                alt="商品画像"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 800px"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
