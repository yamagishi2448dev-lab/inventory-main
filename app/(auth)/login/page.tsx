'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Package, Lock } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (data.success) {
        // Add a small delay for smooth transition feel
        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 500)
      } else {
        setError(data.error || 'ログインに失敗しました')
        setIsLoading(false)
      }
    } catch (err) {
      setError('ログイン処理中にエラーが発生しました')
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border shadow-xl backdrop-blur-sm bg-white/90">
      <CardHeader className="space-y-4 text-center pb-8 pt-8">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200">
            <Package className="h-7 w-7" />
          </div>
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Inventory</CardTitle>
          <CardDescription className="text-slate-500">
            アカウント情報を入力してログインしてください
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">ユーザー名</Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="ユーザー名を入力"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">パスワード</Label>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="パスワードを入力"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="h-10"
            />
          </div>
          {error && (
            <div className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-md border border-red-100 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              {error}
            </div>
          )}
          <Button
            type="submit"
            className="w-full h-10 font-semibold bg-blue-600 hover:bg-blue-700 shadow-md transition-all duration-200"
            disabled={isLoading}
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center pb-8 pt-2">
        <p className="text-xs text-slate-400 text-center">
          &copy; 2026 YAMAGISHI.Inc. All rights reserved.
        </p>
      </CardFooter>
    </Card>
  )
}
