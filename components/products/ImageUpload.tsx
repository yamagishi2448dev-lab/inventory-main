'use client'

import { useState, useRef, DragEvent } from 'react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface ImageData {
  url: string
  order: number
}

interface ImageUploadProps {
  images: ImageData[]
  onChange: (images: ImageData[]) => void
  maxImages?: number
}

export default function ImageUpload({
  images,
  onChange,
  maxImages = 5,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    // 最大枚数チェック
    if (images.length + files.length > maxImages) {
      alert(`画像は最大${maxImages}枚までアップロード可能です`)
      return
    }

    setUploading(true)

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '画像のアップロードに失敗しました')
        }

        return data.url
      })

      const urls = await Promise.all(uploadPromises)

      // 新しい画像を追加
      const newImages: ImageData[] = urls.map((url, index) => ({
        url,
        order: images.length + index,
      }))

      onChange([...images, ...newImages])
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : '画像のアップロードに失敗しました'
      )
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleUpload(e.target.files)
    // inputをリセット（同じファイルを再度選択できるようにする）
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files)
    }
  }

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    // order を再設定
    const reorderedImages = newImages.map((img, i) => ({
      ...img,
      order: i,
    }))
    onChange(reorderedImages)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return

    const newImages = [...images]
    const swapImage = newImages[index]
    newImages[index] = newImages[index - 1]
    newImages[index - 1] = swapImage

    // order を再設定
    const reorderedImages = newImages.map((img, i) => ({
      ...img,
      order: i,
    }))
    onChange(reorderedImages)
  }

  const handleMoveDown = (index: number) => {
    if (index === images.length - 1) return

    const newImages = [...images]
    const swapImage = newImages[index]
    newImages[index] = newImages[index + 1]
    newImages[index + 1] = swapImage

    // order を再設定
    const reorderedImages = newImages.map((img, i) => ({
      ...img,
      order: i,
    }))
    onChange(reorderedImages)
  }

  return (
    <div className="space-y-4">
      {/* アップロードエリア */}
      {images.length < maxImages && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="space-y-2">
            <div className="text-gray-600">
              {dragActive
                ? 'ここにドロップしてください'
                : '画像をドラッグ&ドロップ または'}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'アップロード中...' : 'ファイルを選択'}
            </Button>
            <div className="text-sm text-gray-500">
              JPEG、PNG、WebP (最大5MB、{maxImages}枚まで)
            </div>
          </div>
        </div>
      )}

      {/* 画像プレビュー */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {images.map((image, index) => (
            <div
              key={`${image.url}-${index}`}
              className="relative border rounded-lg p-2 bg-white"
            >
              <div className="relative aspect-square mb-2">
                <Image
                  src={image.url}
                  alt={`商品画像 ${index + 1}`}
                  fill
                  className="object-cover rounded"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
              </div>

              <div className="flex justify-between items-center gap-1">
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="text-xs px-2"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === images.length - 1}
                    className="text-xs px-2"
                  >
                    ↓
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemove(index)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  削除
                </Button>
              </div>

              {index === 0 && (
                <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-tl rounded-br">
                  メイン
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
