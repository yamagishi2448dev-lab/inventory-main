'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import ImageUpload from '@/components/products/ImageUpload'
import { MaterialEditor } from '@/components/products/MaterialEditor'
import { useFilters } from '@/lib/hooks/useFilters'

interface ConsignmentMaterial {
  id?: string
  materialTypeId: string
  materialType?: { id: string; name: string }
  description: string
  imageUrl: string
  order: number
}

interface ConsignmentImage {
  id?: string
  url: string
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
  listPrice: string | null
  arrivalDate: string | null
  location: { id: string; name: string } | null
  notes: string | null
  images: ConsignmentImage[]
  materials?: ConsignmentMaterial[]
}

export default function EditConsignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consignmentId, setConsignmentId] = useState<string | null>(null)
  const [consignmentSku, setConsignmentSku] = useState<string>('')
  const [images, setImages] = useState<ConsignmentImage[]>([])
  const [originalImageIds, setOriginalImageIds] = useState<string[]>([])
  const [materials, setMaterials] = useState<ConsignmentMaterial[]>([])

  const { categories, manufacturers, locations, units } = useFilters()

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
    notes: '',
  })

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

        const consignment: Consignment = await response.json()
        setConsignmentSku(consignment.sku)
        setFormData({
          name: consignment.name,
          manufacturerId: consignment.manufacturer?.id || '',
          categoryId: consignment.category?.id || '',
          specification: consignment.specification || '',
          size: consignment.size || '',
          fabricColor: consignment.fabricColor || '',
          quantity: consignment.quantity,
          unitId: consignment.unit?.id || '',
          listPrice: consignment.listPrice || '',
          arrivalDate: consignment.arrivalDate || '',
          locationId: consignment.location?.id || '',
          notes: consignment.notes || '',
        })
        const loadedImages = (consignment.images || []).map((img) => ({
          id: img.id,
          url: img.url,
          order: img.order,
        }))
        setImages(loadedImages)
        setOriginalImageIds(loadedImages.map((img) => img.id).filter(Boolean) as string[])

        if (consignment.materials) {
          setMaterials(
            consignment.materials.map((m) => ({
              id: m.id,
              materialTypeId: m.materialTypeId,
              materialType: m.materialType,
              description: m.description || '',
              imageUrl: m.imageUrl || '',
              order: m.order,
            }))
          )
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    fetchConsignment()
  }, [consignmentId])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) || 0 : value,
    }))
  }

  const syncImages = async (id: string) => {
    const currentIds = images
      .map((image) => image.id)
      .filter(Boolean) as string[]
    const removedIds = originalImageIds.filter((imageId) => !currentIds.includes(imageId))

    if (removedIds.length > 0) {
      await Promise.all(
        removedIds.map((imageId) =>
          fetch(`/api/consignments/${id}/images?imageId=${imageId}`, {
            method: 'DELETE',
          })
        )
      )
    }

    const reorderPayload = images
      .filter((image) => image.id)
      .map((image) => ({
        id: image.id as string,
        order: image.order,
      }))

    if (reorderPayload.length > 0) {
      await fetch(`/api/consignments/${id}/images`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reorderPayload),
      })
    }

    const newImages = images.filter((image) => !image.id)
    if (newImages.length > 0) {
      await Promise.all(
        newImages.map((image) =>
          fetch(`/api/consignments/${id}/images`, {
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
    }
  }

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault()
    if (!consignmentId) return

    setSubmitting(true)
    setError(null)

    try {
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
        notes: formData.notes || null,
      }

      const response = await fetch(`/api/consignments/${consignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '委託品の更新に失敗しました')
      }

      try {
        await syncImages(consignmentId)
      } catch (imageError) {
        console.warn('委託品画像の保存に失敗しました:', imageError)
      }

      if (materials.length > 0 || true) {
        const materialsPayload = materials.map((m) => ({
          materialTypeId: m.materialTypeId,
          description: m.description || null,
          imageUrl: m.imageUrl || null,
          order: m.order,
        }))

        const materialsResponse = await fetch(`/api/consignments/${consignmentId}/materials`, {
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

      alert('委託品を更新しました')
      router.push('/consignments')
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
        <h1 className="text-3xl font-bold">委託品編集</h1>
        <p className="text-gray-500 mt-1">
          SKU: <span className="font-mono">{consignmentSku}</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
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
          </form>
        </CardContent>
      </Card>

      <MaterialEditor
        productId={consignmentId}
        materials={materials}
        onChange={setMaterials}
      />

      <div className="flex justify-end space-x-4">
        <Link href="/consignments">
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
