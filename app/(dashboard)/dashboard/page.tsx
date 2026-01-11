'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice } from '@/lib/utils'
import { CostByManufacturer } from '@/components/dashboard/CostByManufacturer'
import { OperationRulesCard } from '@/components/dashboard/OperationRulesCard'
import { RecentChanges } from '@/components/dashboard/RecentChanges'

// v2.1 Stats interface
interface Stats {
  totalProducts: number
  totalCategories: number
  totalManufacturers: number
  totalCost: string
}

interface User {
  id: string
  username: string
  role: 'ADMIN' | 'USER'
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)  // v2.1追加

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, sessionRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/auth/session'),  // v2.1追加
        ])

        if (statsRes.ok) {
          const data = await statsRes.json()
          setStats(data)
        }

        // v2.1追加: ユーザー情報取得
        if (sessionRes.ok) {
          const data = await sessionRes.json()
          if (data.authenticated && data.user) {
            setUser(data.user)
          }
        }
      } catch (error) {
        console.error('ダッシュボードデータの取得に失敗しました:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">ダッシュボード</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  // v2.1 統計カードを2つに削減
  const statCards = stats
    ? [
      { title: '原価合計', value: formatPrice(stats.totalCost), description: '全商品の原価合計', highlight: true },
      { title: '商品総数', value: stats.totalProducts.toLocaleString(), description: '登録されている商品' },
    ]
    : []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">ダッシュボード</h1>
      </div>

      {/* 統計カード v2.1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            className={`card-shadow hover:card-shadow-hover hover:-translate-y-1 transition-all duration-200 ${
              stat.highlight ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200' : ''
            }`}
          >
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.highlight ? 'text-blue-700' : ''}`}>
                {stat.value}
              </div>
              <p className="text-sm text-gray-500 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}

        {/* v2.1追加: 運用ルールカード（2列分） */}
        <OperationRulesCard isAdmin={user?.role === 'ADMIN'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左カラム：メーカー別原価合計 */}
        <div>
          <CostByManufacturer />
        </div>

        {/* 右カラム：変更履歴 v2.1 */}
        <div>
          <RecentChanges />
        </div>
      </div>
    </div>
  )
}
