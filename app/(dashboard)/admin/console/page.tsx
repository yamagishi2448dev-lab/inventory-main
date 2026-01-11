'use client'

import { useEffect, useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserManagement, type User, type CreateUserData, type UpdateUserData } from '@/lib/hooks/useUserManagement'
import { UserPlus, Edit, Trash2, KeyRound } from 'lucide-react'

type DialogMode = 'create' | 'edit' | 'resetPassword' | null

export default function AdminConsolePage() {
  const {
    users,
    loading,
    error,
    setError,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
  } = useUserManagement()

  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'USER' as 'ADMIN' | 'USER',
  })

  const [editForm, setEditForm] = useState({
    username: '',
    role: 'USER' as 'ADMIN' | 'USER',
  })

  const [resetPasswordForm, setResetPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleOpenCreateDialog = () => {
    setCreateForm({
      username: '',
      password: '',
      confirmPassword: '',
      role: 'USER',
    })
    setDialogMode('create')
  }

  const handleOpenEditDialog = (user: User) => {
    setEditingUser(user)
    setEditForm({
      username: user.username,
      role: user.role as 'ADMIN' | 'USER',
    })
    setDialogMode('edit')
  }

  const handleOpenResetPasswordDialog = (user: User) => {
    setEditingUser(user)
    setResetPasswordForm({
      newPassword: '',
      confirmPassword: '',
    })
    setDialogMode('resetPassword')
  }

  const handleCloseDialog = () => {
    setDialogMode(null)
    setEditingUser(null)
    setError(null)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // クライアント側バリデーション
    if (createForm.password !== createForm.confirmPassword) {
      setError('パスワードが一致しません')
      setSubmitting(false)
      return
    }

    if (createForm.password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      setSubmitting(false)
      return
    }

    try {
      const data: CreateUserData = {
        username: createForm.username,
        password: createForm.password,
        role: createForm.role,
      }

      await createUser(data)
      alert('ユーザーを作成しました')
      handleCloseDialog()
      await fetchUsers()
    } catch (err) {
      // エラーは useUserManagement フックで設定される
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setSubmitting(true)
    setError(null)

    try {
      const data: UpdateUserData = {
        username: editForm.username,
        role: editForm.role,
      }

      await updateUser(editingUser.id, data)
      alert('ユーザー情報を更新しました')
      handleCloseDialog()
      await fetchUsers()
    } catch (err) {
      // エラーは useUserManagement フックで設定される
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setSubmitting(true)
    setError(null)

    // クライアント側バリデーション
    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      setError('パスワードが一致しません')
      setSubmitting(false)
      return
    }

    if (resetPasswordForm.newPassword.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      setSubmitting(false)
      return
    }

    try {
      await resetPassword(editingUser.id, resetPasswordForm.newPassword)
      alert('パスワードをリセットしました。対象ユーザーは再ログインが必要です。')
      handleCloseDialog()
    } catch (err) {
      // エラーは useUserManagement フックで設定される
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`「${user.username}」を削除してもよろしいですか？`)) {
      return
    }

    try {
      await deleteUser(user.id)
      alert('ユーザーを削除しました')
      await fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ユーザーの削除に失敗しました')
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
        <h1 className="text-3xl font-bold">管理者コンソール</h1>
        <Button onClick={handleOpenCreateDialog}>
          <UserPlus className="w-4 h-4 mr-2" />
          新規ユーザー作成
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>ユーザー一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">ユーザー名</th>
                  <th className="text-left py-3 px-4">ロール</th>
                  <th className="text-left py-3 px-4">作成日時</th>
                  <th className="text-left py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-500">
                      ユーザーがいません
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b">
                      <td className="py-3 px-4 font-medium">{user.username}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                            user.role === 'ADMIN'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditDialog(user)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            編集
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenResetPasswordDialog(user)}
                          >
                            <KeyRound className="w-3 h-3 mr-1" />
                            パスワードリセット
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(user)}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
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

      {/* 新規ユーザー作成ダイアログ */}
      <Dialog open={dialogMode === 'create'} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新規ユーザー作成</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-username">
                  ユーザー名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="create-username"
                  value={createForm.username}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, username: e.target.value }))
                  }
                  required
                  minLength={3}
                  maxLength={50}
                  placeholder="ユーザー名を入力"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">
                  パスワード <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  minLength={8}
                  placeholder="8文字以上"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-confirmPassword">
                  パスワード確認 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="create-confirmPassword"
                  type="password"
                  value={createForm.confirmPassword}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  required
                  placeholder="パスワードを再入力"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-role">
                  ロール <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value: 'ADMIN' | 'USER') =>
                    setCreateForm((prev) => ({ ...prev, role: value }))
                  }
                  disabled={submitting}
                >
                  <SelectTrigger id="create-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">USER</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                  </SelectContent>
                </Select>
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
                {submitting ? '作成中...' : '作成'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ユーザー編集ダイアログ */}
      <Dialog open={dialogMode === 'edit'} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ユーザー編集</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-username">
                  ユーザー名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-username"
                  value={editForm.username}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, username: e.target.value }))
                  }
                  required
                  minLength={3}
                  maxLength={50}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">
                  ロール <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value: 'ADMIN' | 'USER') =>
                    setEditForm((prev) => ({ ...prev, role: value }))
                  }
                  disabled={submitting}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">USER</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                  </SelectContent>
                </Select>
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

      {/* パスワードリセットダイアログ */}
      <Dialog open={dialogMode === 'resetPassword'} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>パスワードリセット - {editingUser?.username}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPasswordSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-newPassword">
                  新しいパスワード <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="reset-newPassword"
                  type="password"
                  value={resetPasswordForm.newPassword}
                  onChange={(e) =>
                    setResetPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                  }
                  required
                  minLength={8}
                  placeholder="8文字以上"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-confirmPassword">
                  パスワード確認 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="reset-confirmPassword"
                  type="password"
                  value={resetPasswordForm.confirmPassword}
                  onChange={(e) =>
                    setResetPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  required
                  placeholder="パスワードを再入力"
                  disabled={submitting}
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
                {submitting ? 'リセット中...' : 'リセット'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
