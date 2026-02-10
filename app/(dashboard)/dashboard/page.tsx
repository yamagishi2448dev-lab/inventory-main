'use client'

import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice } from '@/lib/utils'
import { CostByManufacturer } from '@/components/dashboard/CostByManufacturer'
import { OperationRulesCard } from '@/components/dashboard/OperationRulesCard'
import { RecentChanges } from '@/components/dashboard/RecentChanges'

// SWR fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json())

// v3.0 Stats interface
interface Stats {
  totalProducts: number
  totalConsignments: number
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
  // SWRでキャッシュを有効化（60秒ごとに再検証）
  const { data: stats, isLoading: statsLoading } = useSWR<Stats>(
    '/api/dashboard/stats',
    fetcher,
    {
      refreshInterval: 60000, // 60秒ごとに自動更新
      dedupingInterval: 30000, // 30秒以内の重複リクエストを排除
    }
  )

  const { data: session, isLoading: sessionLoading } = useSWR(
    '/api/auth/session',
    fetcher,
    {
      refreshInterval: 300000, // 5分ごとに自動更新
      dedupingInterval: 60000,
    }
  )

  const loading = statsLoading || sessionLoading
  const user = session?.authenticated ? session.user : null

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Title removed */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Title removed */}

      {/* 統計カード v3.0 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 原価合計カード */}
        <Card className="card-shadow hover:card-shadow-hover hover:-translate-y-1 transition-all duration-200 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              原価合計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {stats ? formatPrice(stats.totalCost) : '...'}
            </div>
            <p className="text-sm text-gray-500 mt-1">全商品の原価合計</p>
          </CardContent>
        </Card>

        {/* 商品・委託品数カード */}
        <Card className="card-shadow hover:card-shadow-hover hover:-translate-y-1 transition-all duration-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              アイテム数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-600 mb-1">商品総数</div>
                <div className="text-2xl font-bold">
                  {stats ? stats.totalProducts.toLocaleString() : '...'}
                </div>
              </div>
              <div className="border-t pt-2">
                <div className="text-xs text-gray-600 mb-1">委託品数</div>
                <div className="text-xl font-semibold">
                  {stats ? stats.totalConsignments.toLocaleString() : '...'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
