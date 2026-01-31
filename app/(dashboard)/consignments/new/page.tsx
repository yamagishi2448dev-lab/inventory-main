'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import ImageUpload from '@/components/products/ImageUpload'
import { useFilters } from '@/lib/hooks/useFilters'

export default function NewConsignmentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<{ url: string; order: number }[]>([])

  // v2.2カスタムフックを使用してフィルタデータを取得
  const { categories, manufacturers, locations, units, tags } = useFilters()

  // v2.2 タグ選択状態
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const [formData, setFormData] = useState({
    name: '',
    manufacturerId: '',
    categoryId: '',
    specification: '',
    size: '',
    fabricColor: '',
    quantity: 0,
    unitId: '',
    listPrice: '',
    arrivalDate: '',
    locationId: '',
    designer: '',  // v2.3追加
    notes: '',
  })

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
      // v2.3 ペイロード
      const payload = {
        name: formData.name,
        manufacturerId: formData.manufacturerId || null,
        categoryId: formData.categoryId || null,
        specification: formData.specification || null,
        size: formData.size || null,
        fabricColor: formData.fabricColor || null,
        quantity: formData.quantity,
        unitId: formData.unitId || null,
        listPrice: formData.listPrice || null,
        arrivalDate: formData.arrivalDate || null,
        locationId: formData.locationId || null,
        designer: formData.designer || null,  // v2.3追加
        notes: formData.notes || null,
        tagIds: selectedTagIds,  // v2.2追加
      }

      const response = await fetch('/api/consignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '委託品の登録に失敗しました')
      }

      const consignmentId = data?.consignment?.id

      if (consignmentId && images.length > 0) {
        try {
          await Promise.all(
            images.map((image) =>
              fetch(`/api/consignments/${consignmentId}/images`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  url: image.url,
                  order: image.order,
                }),
              })
            )
          )
        } catch (imageError) {
          console.warn('委託品画像の保存に失敗しました:', imageError)
        }
      }

      alert('委託品を登録しました')
      router.push('/consignments')
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">委託品登録</h1>
        <p className="text-gray-500 mt-1">SKUは自動採番されます</p>
      </div>

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
              <div className="space-y-2">
                <Label htmlFor="name">
                  商品名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  maxLength={200}
                  placeholder="商品名を入力"
                />
              </div>

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
            </div>

            {/* タグ v2.2追加 */}
            <div className="space-y-2">
              <Label>タグ</Label>
              <div className="border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto">
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

            <div className="space-y-2">
              <Label htmlFor="specification">仕様</Label>
              <textarea
                id="specification"
                name="specification"
                value={formData.specification}
                onChange={handleChange}
                className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={2000}
                placeholder="仕様を入力"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="size">サイズ</Label>
              <Input
                id="size"
                name="size"
                value={formData.size}
                onChange={handleChange}
                maxLength={200}
                placeholder="W1200×D600×H400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fabricColor">張地/カラー</Label>
              <textarea
                id="fabricColor"
                name="fabricColor"
                value={formData.fabricColor}
                onChange={handleChange}
                className="w-full min-h-[60px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={2000}
                placeholder="張地・カラー情報を入力"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="quantity">個数</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={handleChange}
                  min="0"
                  placeholder="0"
                />
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="arrivalDate">入荷年月</Label>
                <Input
                  id="arrivalDate"
                  name="arrivalDate"
                  value={formData.arrivalDate}
                  onChange={handleChange}
                  placeholder="2024年1月"
                  maxLength={50}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="listPrice">定価単価</Label>
                <Input
                  id="listPrice"
                  name="listPrice"
                  type="text"
                  value={formData.listPrice}
                  onChange={handleChange}
                  placeholder="20000"
                />
              </div>

              <div className="space-y-2">
                <Label>原価単価</Label>
                <div className="h-10 px-3 flex items-center border border-gray-200 rounded-md bg-gray-50 text-gray-600">
                  0 (固定)
                </div>
              </div>
            </div>

            {/* デザイナー v2.3追加 */}
            <div className="space-y-2">
              <Label htmlFor="designer">デザイナー</Label>
              <Input
                id="designer"
                name="designer"
                value={formData.designer}
                onChange={handleChange}
                maxLength={200}
                placeholder="デザイナー名を入力"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">備考</Label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={2000}
                placeholder="備考を入力"
              />
            </div>

            <div className="space-y-2">
              <Label>委託品画像</Label>
              <ImageUpload images={images} onChange={setImages} maxImages={5} />
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/consignments">
                <Button type="button" variant="outline" disabled={loading}>
                  キャンセル
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? '登録中...' : '登録'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
