'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ImageUpload from '@/components/products/ImageUpload'
import { useFilters } from '@/lib/hooks/useFilters'
import type { ItemType } from '@/lib/types'

interface ItemCreatePageCoreProps {
  forcedItemType?: ItemType
  listPath?: string
  hideTypeTabs?: boolean
}

export function ItemCreatePageCore({
  forcedItemType,
  listPath = '/items',
  hideTypeTabs = false,
}: ItemCreatePageCoreProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<{ url: string; order: number }[]>([])

  // アイテムタイプ
  const typeParam = searchParams.get('type') as ItemType | null
  const [itemType, setItemType] = useState<ItemType>(
    forcedItemType || (typeParam === 'CONSIGNMENT' ? 'CONSIGNMENT' : 'PRODUCT')
  )

  // フィルタデータを取得
  const { categories, manufacturers, locations, units, tags } = useFilters()

  // タグ選択状態
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  // フォームデータ
  const [formData, setFormData] = useState({
    name: '',
    manufacturerId: '',
    categoryId: '',
    specification: '',
    size: '',
    fabricColor: '',
    quantity: 0,
    unitId: '',
    costPrice: '',
    listPrice: '',
    arrivalDate: '',
    locationId: '',
    designer: '',
    notes: '',
  })

  // URLパラメータからitemTypeを同期
  useEffect(() => {
    if (forcedItemType) {
      setItemType(forcedItemType)
      return
    }

    if (typeParam === 'CONSIGNMENT') {
      setItemType('CONSIGNMENT')
    } else if (typeParam === 'PRODUCT') {
      setItemType('PRODUCT')
    }
  }, [typeParam, forcedItemType])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) || 0 : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // ペイロード
      const payload = {
        itemType,
        name: formData.name,
        manufacturerId: formData.manufacturerId || null,
        categoryId: formData.categoryId || null,
        specification: formData.specification || null,
        size: formData.size || null,
        fabricColor: formData.fabricColor || null,
        quantity: formData.quantity,
        unitId: formData.unitId || null,
        costPrice: itemType === 'PRODUCT' ? formData.costPrice : null,
        listPrice: formData.listPrice || null,
        arrivalDate: formData.arrivalDate || null,
        locationId: formData.locationId || null,
        designer: formData.designer || null,
        notes: formData.notes || null,
        images: images,
        tagIds: selectedTagIds,
      }

      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'アイテムの登録に失敗しました')
      }

      alert(`${itemType === 'PRODUCT' ? '商品' : '委託品'}を登録しました`)
      if (listPath === '/items') {
        router.push(`/items?type=${itemType}`)
      } else {
        router.push(listPath)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const getTypeLabel = () => itemType === 'PRODUCT' ? '商品' : '委託品'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{getTypeLabel()}登録</h1>
        <p className="text-gray-500 mt-1">SKUは自動採番されます</p>
      </div>

      {/* タイプ切り替え */}
      {!hideTypeTabs && !forcedItemType && (
        <Tabs value={itemType} onValueChange={(value) => setItemType(value as ItemType)}>
          <TabsList>
            <TabsTrigger value="PRODUCT">商品</TabsTrigger>
            <TabsTrigger value="CONSIGNMENT">委託品</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 名前 */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  {getTypeLabel()}名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  maxLength={200}
                  placeholder={`${getTypeLabel()}名を入力`}
                />
              </div>

              {/* メーカー */}
              <div className="space-y-2">
                <Label htmlFor="manufacturerId">メーカー</Label>
                <select
                  id="manufacturerId"
                  name="manufacturerId"
                  value={formData.manufacturerId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">未選択</option>
                  {manufacturers.map((manufacturer) => (
                    <option key={manufacturer.id} value={manufacturer.id}>
                      {manufacturer.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 品目 */}
              <div className="space-y-2">
                <Label htmlFor="categoryId">品目</Label>
                <select
                  id="categoryId"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">未選択</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 仕様 */}
              <div className="space-y-2">
                <Label htmlFor="specification">仕様</Label>
                <Input
                  id="specification"
                  name="specification"
                  value={formData.specification}
                  onChange={handleChange}
                  placeholder="仕様を入力"
                />
              </div>

              {/* サイズ */}
              <div className="space-y-2">
                <Label htmlFor="size">サイズ</Label>
                <Input
                  id="size"
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  placeholder="サイズを入力"
                />
              </div>

              {/* 張地/カラー */}
              <div className="space-y-2">
                <Label htmlFor="fabricColor">張地/カラー</Label>
                <textarea
                  id="fabricColor"
                  name="fabricColor"
                  value={formData.fabricColor}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="張地/カラーを入力"
                />
              </div>

              {/* 個数 */}
              <div className="space-y-2">
                <Label htmlFor="quantity">個数</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={handleChange}
                />
              </div>

              {/* 単位 */}
              <div className="space-y-2">
                <Label htmlFor="unitId">単位</Label>
                <select
                  id="unitId"
                  name="unitId"
                  value={formData.unitId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">未選択</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 原価単価（商品のみ） */}
              {itemType === 'PRODUCT' && (
                <div className="space-y-2">
                  <Label htmlFor="costPrice">
                    原価単価 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="costPrice"
                    name="costPrice"
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={handleChange}
                    required
                    placeholder="原価単価を入力"
                  />
                </div>
              )}

              {/* 定価単価 */}
              <div className="space-y-2">
                <Label htmlFor="listPrice">定価単価</Label>
                <Input
                  id="listPrice"
                  name="listPrice"
                  type="number"
                  step="0.01"
                  value={formData.listPrice}
                  onChange={handleChange}
                  placeholder="定価単価を入力"
                />
              </div>

              {/* 入荷年月 */}
              <div className="space-y-2">
                <Label htmlFor="arrivalDate">入荷年月</Label>
                <Input
                  id="arrivalDate"
                  name="arrivalDate"
                  value={formData.arrivalDate}
                  onChange={handleChange}
                  placeholder="例: 2024年1月"
                />
              </div>

              {/* 場所 */}
              <div className="space-y-2">
                <Label htmlFor="locationId">場所</Label>
                <select
                  id="locationId"
                  name="locationId"
                  value={formData.locationId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">未選択</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* デザイナー */}
              <div className="space-y-2">
                <Label htmlFor="designer">デザイナー</Label>
                <Input
                  id="designer"
                  name="designer"
                  value={formData.designer}
                  onChange={handleChange}
                  placeholder="デザイナーを入力"
                />
              </div>
            </div>

            {/* 備考 */}
            <div className="space-y-2">
              <Label htmlFor="notes">備考</Label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="備考を入力"
              />
            </div>

            {/* タグ */}
            <div className="space-y-2">
              <Label>タグ</Label>
              <div className="border rounded-md p-3 max-h-32 overflow-y-auto">
                {tags.length === 0 ? (
                  <p className="text-sm text-gray-400">タグがありません</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {tags.map((tag) => (
                      <label key={tag.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedTagIds.includes(tag.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTagIds([...selectedTagIds, tag.id])
                            } else {
                              setSelectedTagIds(selectedTagIds.filter((id) => id !== tag.id))
                            }
                          }}
                        />
                        <span className="text-sm">{tag.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 画像アップロード */}
            <div className="space-y-2">
              <Label>画像</Label>
              <ImageUpload
                images={images}
                onChange={setImages}
                maxImages={5}
              />
            </div>

            {/* ボタン */}
            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? '登録中...' : '登録'}
              </Button>
              <Link href={listPath === '/items' ? `/items${itemType ? `?type=${itemType}` : ''}` : listPath}>
                <Button type="button" variant="outline">
                  キャンセル
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function NewItemPage() {
  return <ItemCreatePageCore />
}
