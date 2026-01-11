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

export default function CategoriesPage() {
  const {
    items: categories,
    loading,
    error,
    refresh,
    createItem,
    updateItem,
    deleteItem,
    setError,
  } = useMasterDataList<NamedEntityWithCount>({
    endpoint: '/api/categories',
    responseKey: 'categories',
    entityLabel: '品目',
    messages: {
      list: '品目の取得に失敗しました',
      create: '品目の保存に失敗しました',
      update: '品目の保存に失敗しました',
      delete: '品目の削除に失敗しました',
    },
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<NamedEntityWithCount | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
  })

  const handleOpenDialog = (category?: NamedEntityWithCount) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name,
      })
    } else {
      setEditingCategory(null)
      setFormData({
        name: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingCategory(null)
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
      if (editingCategory) {
        await updateItem(editingCategory.id, formData.name)
      } else {
        await createItem(formData.name)
      }

      alert(editingCategory ? '品目を更新しました' : '品目を作成しました')
      handleCloseDialog()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (category: NamedEntityWithCount) => {
    if (!confirm(`「${category.name}」を削除してもよろしいですか？`)) {
      return
    }

    try {
      await deleteItem(category.id)
      alert('品目を削除しました')
      await refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : '品目の削除に失敗しました')
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">品目管理</h1>
        <Button onClick={() => handleOpenDialog()}>+ 新規品目</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>品目一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">品目名</th>
                  <th className="text-left py-3 px-4">商品数</th>
                  <th className="text-left py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-gray-500">
                      品目がありません
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id} className="border-b">
                      <td className="py-3 px-4 font-medium">{category.name}</td>
                      <td className="py-3 px-4">{category._count?.products ?? 0}</td>
                      <td className="py-3 px-4">
                        <div className="space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(category)}
                          >
                            編集
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(category)}
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
              {editingCategory ? '品目編集' : '新規品目'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  品目名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  placeholder="品目名を入力"
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
