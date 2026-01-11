'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/lib/contexts/SidebarContext'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, LogOut, KeyRound, Menu } from 'lucide-react'

interface HeaderProps {
  username: string
  role: string
}

export function Header({ username, role }: HeaderProps) {
  const router = useRouter()
  const { isMobile, toggle } = useSidebar()
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      if (response.ok) {
        router.push('/login')
      } else {
        alert('ログアウトに失敗しました')
      }
    } catch (error) {
      console.error('ログアウトエラー:', error)
      alert('ログアウトに失敗しました')
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordForm((prev) => ({ ...prev, [name]: value }))
    setPasswordError(null)
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)

    // クライアント側バリデーション
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('新しいパスワードが一致しません')
      return
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('新しいパスワードは8文字以上で入力してください')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setPasswordError(data.error || 'パスワードの変更に失敗しました')
        return
      }

      alert('パスワードを変更しました')
      setIsPasswordDialogOpen(false)
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error) {
      console.error('パスワード変更エラー:', error)
      setPasswordError('パスワードの変更に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClosePasswordDialog = () => {
    setIsPasswordDialogOpen(false)
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    setPasswordError(null)
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                className="text-gray-600 hover:text-gray-900"
                aria-label="サイドバーを開閉"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="text-xs text-gray-500 font-medium">
              在庫管理システム v2.1
            </div>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="text-sm font-semibold text-gray-600">
                {username}
                {role === 'ADMIN' && (
                  <span className="ml-2 text-xs text-gray-500">(Admin)</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56">
              <div className="space-y-2">
                {role === 'ADMIN' && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => router.push('/admin/console')}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    管理者コンソール
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setIsPasswordDialogOpen(true)}
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  パスワード変更
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  ログアウト
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>パスワード変更</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit}>
            <div className="space-y-4">
              {passwordError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
                  {passwordError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">
                  現在のパスワード <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  新しいパスワード <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  required
                  minLength={8}
                  disabled={submitting}
                />
                <p className="text-xs text-gray-500">8文字以上で入力してください</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  パスワード確認 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleClosePasswordDialog}
                disabled={submitting}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '変更中...' : '変更'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
