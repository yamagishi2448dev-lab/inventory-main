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

interface ConsignmentMaterial {
  id: string
  materialTypeId: string
  materialType: { id: string; name: string }
  description: string | null
  imageUrl: string | null
  order: number
}

interface Consignment {
  id: string
  sku: string
  name: string
  manufacturer: { id: string; name: string } | null
  category: { id: string; name: string } | null
  specification: string | null
  size: string | null
  fabricColor: string | null
  quantity: number
  unit: { id: string; name: string } | null
  costPrice: string
  listPrice: string | null
  arrivalDate: string | null
  location: { id: string; name: string } | null
  designer: string | null  // v2.3追加
  notes: string | null
  isSold: boolean
  soldAt: string | null
  images: { id: string; url: string; order: number }[]
  materials?: ConsignmentMaterial[]
  totalCost: string
  createdAt: string
  updatedAt: string
}

export default function ConsignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [consignment, setConsignment] = useState<Consignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [consignmentId, setConsignmentId] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const returnQuery = searchParams.toString()
  const backHref = returnQuery ? `/consignments?${returnQuery}` : '/consignments'

  useEffect(() => {
    const initParams = async () => {
      const resolvedParams = await params
      setConsignmentId(resolvedParams.id)
    }
    initParams()
  }, [params])

  useEffect(() => {
    if (!consignmentId) return

    const fetchConsignment = async () => {
      try {
        const response = await fetch(`/api/consignments/${consignmentId}`)

        if (!response.ok) {
          throw new Error('委託品の取得に失敗しました')
        }

        const data = await response.json()
        setConsignment(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    fetchConsignment()
  }, [consignmentId])

  const handleDelete = async () => {
    if (!consignment || !consignmentId) return

    if (!confirm(`「${consignment.name}」を削除してもよろしいですか？`)) {
      return
    }

    try {
      const response = await fetch(`/api/consignments/${consignmentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('委託品の削除に失敗しました')
      }

      alert('委託品を削除しました')
      router.push('/consignments')
    } catch (err) {
      alert(err instanceof Error ? err.message : '委託品の削除に失敗しました')
    }
  }

  const handleSoldToggle = async (newSoldState: boolean) => {
    if (!consignment || !consignmentId) return

    const action = newSoldState ? '販売済みに' : '販売済みを解除'
    if (!confirm(`この委託品を${action}しますか？`)) {
      return
    }

    try {
      const response = await fetch(`/api/consignments/${consignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...consignment,
          isSold: newSoldState,
          soldAt: newSoldState ? new Date().toISOString() : null,
        }),
      })

      if (!response.ok) {
        throw new Error('販売済み状態の更新に失敗しました')
      }

      const data = await response.json()
      setConsignment(data.consignment || data)
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

  if (error || !consignment) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">委託品詳細</h1>
        </div>
        <div className="text-red-600">{error || '委託品が見つかりません'}</div>
        <Link href={backHref}>
          <Button variant="outline">委託品一覧に戻る</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">委託品詳細</h1>
          {consignment.isSold && (
            <Badge variant="secondary" className="bg-gray-500 text-white">
              販売済み
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 px-3 py-1 border rounded-md bg-white">
            <Checkbox
              id="sold-checkbox"
              checked={consignment.isSold}
              onCheckedChange={(checked) => handleSoldToggle(checked === true)}
            />
            <label htmlFor="sold-checkbox" className="text-sm cursor-pointer">
              販売済み
            </label>
          </div>
          <Link href={returnQuery ? `/consignments/${consignment.id}/edit?${returnQuery}` : `/consignments/${consignment.id}/edit`}>
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

      {consignment.images && consignment.images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>委託品画像</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {consignment.images
                .sort((a, b) => a.order - b.order)
                .map((image, index) => (
                  <div
                    key={image.id}
                    className="relative aspect-square border rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedImage(image.url)}
                  >
                    <Image
                      src={image.url}
                      alt={`${consignment.name} - 画像 ${index + 1}`}
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

      {consignment.materials && consignment.materials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>素材情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {consignment.materials
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
              <div className="font-medium font-mono">{consignment.sku}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">商品名</div>
              <div className="font-medium">{consignment.name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">メーカー</div>
              <div className="font-medium">{consignment.manufacturer?.name || '未設定'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">品目</div>
              <div className="font-medium">{consignment.category?.name || '未設定'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">場所</div>
              <div className="font-medium">{consignment.location?.name || '未設定'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">入荷年月</div>
              <div className="font-medium">{consignment.arrivalDate || '未設定'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">デザイナー</div>
              <div className="font-medium">{consignment.designer || '未設定'}</div>
            </div>
          </div>

          {consignment.specification && (
            <div>
              <div className="text-sm text-gray-500">仕様</div>
              <div className="mt-1 whitespace-pre-wrap">{consignment.specification}</div>
            </div>
          )}

          {consignment.size && (
            <div>
              <div className="text-sm text-gray-500">サイズ</div>
              <div className="mt-1">{consignment.size}</div>
            </div>
          )}

          {consignment.fabricColor && (
            <div>
              <div className="text-sm text-gray-500">張地/カラー</div>
              <div className="mt-1 whitespace-pre-wrap">{consignment.fabricColor}</div>
            </div>
          )}

          {consignment.isSold && consignment.soldAt && (
            <div>
              <div className="text-sm text-gray-500">販売済み日時</div>
              <div className="mt-1 text-gray-600">
                {new Date(consignment.soldAt).toLocaleString('ja-JP')}
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
                {consignment.quantity} {consignment.unit?.name || ''}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">原価単価</div>
              <div className="font-medium text-lg">{formatPrice(consignment.costPrice)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">定価単価</div>
              <div className="font-medium text-lg">
                {consignment.listPrice ? formatPrice(consignment.listPrice) : '未設定'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">原価合計</div>
              <div className="font-medium text-lg text-blue-600">
                {formatPrice(consignment.totalCost)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {consignment.notes && (
        <Card>
          <CardHeader>
            <CardTitle>備考</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap">{consignment.notes}</div>
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
              {new Date(consignment.createdAt).toLocaleString('ja-JP')}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">更新日時</div>
            <div className="text-sm">
              {new Date(consignment.updatedAt).toLocaleString('ja-JP')}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          {selectedImage && (
            <div className="relative w-full h-[600px]">
              <Image
                src={selectedImage}
                alt="委託品画像"
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
