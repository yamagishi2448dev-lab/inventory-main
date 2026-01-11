'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, ArrowUp, ArrowDown, Upload, X } from 'lucide-react'

interface MaterialType {
  id: string
  name: string
  order: number
}

interface ProductMaterial {
  id?: string
  materialTypeId: string
  materialType?: { id: string; name: string }
  description: string
  imageUrl: string
  order: number
}

interface MaterialEditorProps {
  productId: string | null
  materials: ProductMaterial[]
  onChange: (materials: ProductMaterial[]) => void
}

export function MaterialEditor({ productId, materials, onChange }: MaterialEditorProps) {
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<number | null>(null)

  useEffect(() => {
    const fetchMaterialTypes = async () => {
      try {
        const res = await fetch('/api/material-types')
        if (res.ok) {
          const data = await res.json()
          setMaterialTypes(data.materialTypes || [])
        }
      } catch (error) {
        console.error('Failed to fetch material types:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMaterialTypes()
  }, [])

  const handleAdd = () => {
    if (materialTypes.length === 0) {
      alert('素材項目が登録されていません。先に素材項目を登録してください。')
      return
    }

    const newMaterial: ProductMaterial = {
      materialTypeId: materialTypes[0]?.id || '',
      description: '',
      imageUrl: '',
      order: materials.length,
    }
    onChange([...materials, newMaterial])
  }

  const handleRemove = (index: number) => {
    const updated = materials.filter((_, i) => i !== index)
    // Reorder
    updated.forEach((m, i) => {
      m.order = i
    })
    onChange(updated)
  }

  const handleChange = (index: number, field: keyof ProductMaterial, value: string) => {
    const updated = [...materials]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const updated = [...materials]
    const temp = updated[index]
    updated[index] = updated[index - 1]
    updated[index - 1] = temp
    // Update order
    updated.forEach((m, i) => {
      m.order = i
    })
    onChange(updated)
  }

  const handleMoveDown = (index: number) => {
    if (index === materials.length - 1) return
    const updated = [...materials]
    const temp = updated[index]
    updated[index] = updated[index + 1]
    updated[index + 1] = temp
    // Update order
    updated.forEach((m, i) => {
      m.order = i
    })
    onChange(updated)
  }

  const handleImageUpload = async (index: number, file: File) => {
    setUploading(index)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error('画像のアップロードに失敗しました')
      }

      const data = await res.json()
      handleChange(index, 'imageUrl', data.url)
    } catch (error) {
      alert(error instanceof Error ? error.message : '画像のアップロードに失敗しました')
    } finally {
      setUploading(null)
    }
  }

  const handleImageRemove = (index: number) => {
    handleChange(index, 'imageUrl', '')
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>素材情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-20 bg-gray-100 rounded" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>素材情報</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-1" />
          素材を追加
        </Button>
      </CardHeader>
      <CardContent>
        {materials.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            素材情報がありません。「素材を追加」ボタンで追加できます。
          </p>
        ) : (
          <div className="space-y-4">
            {materials.map((material, index) => (
              <div
                key={material.id || `new-${index}`}
                className="border rounded-lg p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === materials.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">#{index + 1}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    onClick={() => handleRemove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>素材項目</Label>
                    <select
                      value={material.materialTypeId}
                      onChange={(e) => handleChange(index, 'materialTypeId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {materialTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>説明</Label>
                    <Input
                      value={material.description}
                      onChange={(e) => handleChange(index, 'description', e.target.value)}
                      placeholder="説明を入力"
                      maxLength={500}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>画像</Label>
                  {material.imageUrl ? (
                    <div className="relative inline-block">
                      <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                        <Image
                          src={material.imageUrl}
                          alt="素材画像"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                        onClick={() => handleImageRemove(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleImageUpload(index, file)
                            }
                          }}
                          disabled={uploading !== null}
                        />
                        <div className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                          {uploading === index ? (
                            <span className="text-sm text-gray-500">アップロード中...</span>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-500">画像を選択</span>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
