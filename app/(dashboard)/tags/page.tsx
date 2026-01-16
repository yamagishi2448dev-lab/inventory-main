'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useMasterDataList } from '@/lib/hooks/useMasterDataList'
import type { NamedEntityWithCount } from '@/lib/types'

interface TagWithCount extends NamedEntityWithCount {
  _count?: {
    products: number
    consignments?: number
  }
}

export default function TagsPage() {
  const {
    items: tags,
    loading,
    error,
    refresh,
    createItem,
    updateItem,
    deleteItem,
    setError,
  } = useMasterDataList<TagWithCount>({
    endpoint: '/api/tags',
    responseKey: 'tags',
    entityLabel: 'タグ',
    messages: {
      list: 'タグの取得に失敗しました',
      create: 'タグの保存に失敗しました',
      update: 'タグの保存に失敗しました',
      delete: 'タグの削除に失敗しました',
    },
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TagWithCount | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
  })

  const handleOpenDialog = (tag?: TagWithCount) => {
    if (tag) {
      setEditingTag(tag)
      setFormData({
        name: tag.name,
      })
    } else {
      setEditingTag(null)
      setFormData({
        name: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingTag(null)
    setFormData({ name: '' })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (editingTag) {
        await updateItem(editingTag.id, formData.name)
      } else {
        await createItem(formData.name)
      }

      alert(editingTag ? 'タグを更新しました' : 'タグを作成しました')
      handleCloseDialog()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (tag: TagWithCount) => {
    if (!confirm(`「${tag.name}」を削除してもよろしいですか？`)) {
      return
    }

    try {
      await deleteItem(tag.id)
      alert('タグを削除しました')
      await refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'タグの削除に失敗しました')
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
      <div className="flex justify-end items-center">
        {/* Title removed */}
        <Button onClick={() => handleOpenDialog()}>+ 新規タグ</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>タグ一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">タグ名</th>
                  <th className="text-left py-3 px-4">商品数</th>
                  <th className="text-left py-3 px-4">委託品数</th>
                  <th className="text-left py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {tags.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-500">
                      タグがありません
                    </td>
                  </tr>
                ) : (
                  tags.map((tag) => (
                    <tr key={tag.id} className="border-b">
                      <td className="py-3 px-4 font-medium">{tag.name}</td>
                      <td className="py-3 px-4">{tag._count?.products ?? 0}</td>
                      <td className="py-3 px-4">{tag._count?.consignments ?? 0}</td>
                      <td className="py-3 px-4">
                        <div className="space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(tag)}
                          >
                            編集
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(tag)}
                          >
                            削除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTag ? 'タグ編集' : '新規タグ'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  タグ名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  maxLength={50}
                  placeholder="タグ名を入力"
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={submitting}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
