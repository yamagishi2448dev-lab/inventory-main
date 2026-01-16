'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
import { Settings, LogOut, KeyRound, Menu, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  username: string
  role: string
}

export function Header({ username, role }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isMobile, toggle } = useSidebar()
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 簡易的なパンくずリスト生成
  const getBreadcrumb = () => {
    const paths = pathname.split('/').filter(Boolean)
    if (paths.length === 0) return 'ダッシュボード'

    // マッピング定義 (必要に応じて拡張)
    const labelMap: Record<string, string> = {
      dashboard: 'ダッシュボード',
      products: '商品管理',
      consignments: '委託品',
      categories: '品目',
      manufacturers: 'メーカー',
      locations: '場所',
      units: '単位',
      'material-types': '素材項目',
      tags: 'タグ設定',
      admin: '管理者',
      console: 'コンソール'
    }

    return (
      <div className="flex items-center text-sm text-slate-500">
        <span className="font-medium text-slate-800">{labelMap[paths[0]] || paths[0]}</span>
        {paths.length > 1 && (
          <>
            <ChevronRight className="w-4 h-4 mx-1 text-slate-300" />
            <span>{paths[1] === 'new' ? '新規登録' : (labelMap[paths[1]] || paths[1])}</span>
          </>
        )}
      </div>
    )
  }

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
      <header className="sticky top-0 z-30 w-full glass">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                className="text-slate-500 hover:text-slate-900"
                aria-label="サイドバーを開閉"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}

            <div className="flex flex-col">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Page</div>
              {getBreadcrumb()}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 rounded-full border border-border px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                  <div className="h-5 w-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  {username}
                  {role === 'ADMIN' && (
                    <span className="ml-1 rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">Admin</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-1">
                <div className="px-2 py-1.5 text-xs text-slate-500 font-medium">マイアカウント</div>
                <div className="space-y-0.5">
                  {role === 'ADMIN' && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-8 text-sm"
                      onClick={() => router.push('/admin/console')}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      管理者コンソール
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-8 text-sm"
                    onClick={() => setIsPasswordDialogOpen(true)}
                  >
                    <KeyRound className="w-4 h-4 mr-2" />
                    パスワード変更
                  </Button>
                  <div className="my-1 border-t border-border" />
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-8 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    ログアウト
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>パスワード変更</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit}>
            <div className="space-y-4 py-2">
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
                <p className="text-xs text-slate-500">8文字以上で入力してください</p>
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

            <DialogFooter className="mt-4">
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
