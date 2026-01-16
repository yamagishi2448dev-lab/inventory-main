'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import ImageUpload from '@/components/products/ImageUpload'
import { MaterialEditor } from '@/components/products/MaterialEditor'
import { useFilters } from '@/lib/hooks/useFilters'

// v2.1 Product type
interface ProductMaterial {
  id?: string
  materialTypeId: string
  materialType?: { id: string; name: string }
  description: string
  imageUrl: string
  order: number
}

interface Product {
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
  notes: string | null
  images: { id: string; url: string; order: number }[]
  materials?: ProductMaterial[]
  tags?: { id: string; tagId: string; tag?: { id: string; name: string } }[]  // v2.2追加
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productId, setProductId] = useState<string | null>(null)
  const [productSku, setProductSku] = useState<string>('')
  const [images, setImages] = useState<{ url: string; order: number }[]>([])
  const [materials, setMaterials] = useState<ProductMaterial[]>([])  // v2.1追加

  // v2.0カスタムフックを使用
  const { categories, manufacturers, locations, units, tags } = useFilters()

  // v2.2 タグ選択状態
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

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

        const product: Product = await response.json()
        setProductSku(product.sku)
        setFormData({
          name: product.name,
          manufacturerId: product.manufacturer?.id || '',
          categoryId: product.category?.id || '',
          specification: product.specification || '',
          size: product.size || '',  // v2.1追加
          fabricColor: product.fabricColor || '',
          quantity: product.quantity,
          unitId: product.unit?.id || '',
          costPrice: product.costPrice,
          listPrice: product.listPrice || '',
          arrivalDate: product.arrivalDate || '',
          locationId: product.location?.id || '',
          notes: product.notes || '',
        })
        setImages(product.images.map((img) => ({ url: img.url, order: img.order })))
        // v2.1追加: 素材情報を設定
        if (product.materials) {
          setMaterials(product.materials.map((m) => ({
            id: m.id,
            materialTypeId: m.materialTypeId,
            materialType: m.materialType,
            description: m.description || '',
            imageUrl: m.imageUrl || '',
            order: m.order,
          })))
        }
        // v2.2追加: タグ情報を設定
        if (product.tags) {
          setSelectedTagIds(product.tags.map((t) => t.tagId))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) || 0 : value,
    }))
  }

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault()
    if (!productId) return

    setSubmitting(true)
    setError(null)

    try {
      // v2.2 ペイロード
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
        tagIds: selectedTagIds,  // v2.2追加
      }

      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '商品の更新に失敗しました')
      }

      // v2.1追加: 素材情報を保存
      if (materials.length > 0 || true) {  // 空でも既存を削除するために常に送信
        const materialsPayload = {
          materials: materials.map((m) => ({
            materialTypeId: m.materialTypeId,
            description: m.description || null,
            imageUrl: m.imageUrl || null,
            order: m.order,
          })),
        }

        const materialsResponse = await fetch(`/api/products/${productId}/materials`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(materialsPayload),
        })

        if (!materialsResponse.ok) {
          console.warn('素材情報の保存に失敗しました')
        }
      }

      alert('商品を更新しました')
      router.push('/products')
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setSubmitting(false)
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">商品編集</h1>
        <p className="text-gray-500 mt-1">SKU: <span className="font-mono">{productSku}</span></p>
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
          </form>
        </CardContent>
      </Card>

      {/* v2.1追加: 素材情報 */}
      <MaterialEditor
        productId={productId}
        materials={materials}
        onChange={setMaterials}
      />

      <div className="flex justify-end space-x-4">
        <Link href="/products">
          <Button type="button" variant="outline" disabled={submitting}>
            キャンセル
          </Button>
        </Link>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? '更新中...' : '更新'}
        </Button>
      </div>
    </div>
  )
}
