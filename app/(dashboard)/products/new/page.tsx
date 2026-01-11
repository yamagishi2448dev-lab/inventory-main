'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ImageUpload from '@/components/products/ImageUpload'
import { useFilters } from '@/lib/hooks/useFilters'

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<{ url: string; order: number }[]>([])

  // v2.0カスタムフックを使用してフィルタデータを取得
  const { categories, manufacturers, locations, units } = useFilters()

  // v2.1フォームデータ
  const [formData, setFormData] = useState({
    name: '',
    manufacturerId: '',
    categoryId: '',
    specification: '',
    size: '',  // v2.1追加
    fabricColor: '',
    quantity: 0,
    unitId: '',
    costPrice: '',
    listPrice: '',
    arrivalDate: '',
    locationId: '',
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
      // v2.1 ペイロード（SKUは自動採番）
      const payload = {
        name: formData.name,
        manufacturerId: formData.manufacturerId || null,
        categoryId: formData.categoryId || null,
        specification: formData.specification || null,
        size: formData.size || null,  // v2.1追加
        fabricColor: formData.fabricColor || null,
        quantity: formData.quantity,
        unitId: formData.unitId || null,
        costPrice: formData.costPrice,
        listPrice: formData.listPrice || null,
        arrivalDate: formData.arrivalDate || null,
        locationId: formData.locationId || null,
        notes: formData.notes || null,
        images: images,
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '商品の登録に失敗しました')
      }

      alert('商品を登録しました')
      router.push('/products')
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">商品登録</h1>
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
              {/* 商品名 */}
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
            </div>

            {/* 仕様 */}
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

            {/* サイズ v2.1追加 */}
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

            {/* 張地/カラー */}
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
              {/* 個数 */}
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

              {/* 入荷年月 */}
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
              {/* 原価単価 */}
              <div className="space-y-2">
                <Label htmlFor="costPrice">
                  原価単価 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="costPrice"
                  name="costPrice"
                  type="text"
                  value={formData.costPrice}
                  onChange={handleChange}
                  required
                  placeholder="10000"
                />
              </div>

              {/* 定価単価 */}
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
            </div>

            {/* 備考 */}
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

            {/* 商品画像 */}
            <div className="space-y-2">
              <Label>商品画像</Label>
              <ImageUpload images={images} onChange={setImages} maxImages={5} />
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/products">
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
