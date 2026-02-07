'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface ChangeLogField {
  field: string
  label: string
  from?: string
  to?: string
}

interface ChangeLog {
  id: string
  entityType: 'item' | 'product' | 'consignment'
  entityId: string
  entityName: string
  entitySku: string
  action: 'create' | 'update' | 'delete'
  changes: { fields: ChangeLogField[] } | null
  itemType?: 'PRODUCT' | 'CONSIGNMENT' | string | null
  userId: string
  userName: string
  createdAt: string
}

export function RecentChanges() {
  const [changeLogs, setChangeLogs] = useState<ChangeLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChangeLogs = async () => {
      try {
        const res = await fetch('/api/change-logs?limit=20')
        if (res.ok) {
          const data = await res.json()
          setChangeLogs(data.changeLogs || [])
        }
      } catch (error) {
        console.error('Failed to fetch change logs:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchChangeLogs()
  }, [])

  const getActionLabel = (action: ChangeLog['action']) => {
    switch (action) {
      case 'create':
        return '作成'
      case 'update':
        return '編集'
      case 'delete':
        return '削除'
      default:
        return action
    }
  }

  const getActionBadgeVariant = (action: ChangeLog['action']) => {
    switch (action) {
      case 'create':
        return 'default'  // green-ish
      case 'update':
        return 'secondary'  // blue-ish
      case 'delete':
        return 'destructive'  // red
      default:
        return 'outline'
    }
  }

  const getEntityTypeLabel = (entityType: ChangeLog['entityType']) => {
    if (entityType === 'item') {
      return 'アイテム'
    }
    switch (entityType) {
      case 'product':
        return '商品'
      case 'consignment':
        return '委託品'
      default:
        return entityType
    }
  }

  const getEntityLink = (log: ChangeLog) => {
    if (log.action === 'delete') {
      return null  // 削除された場合はリンクなし
    }
    if (log.entityType === 'item') {
      if (log.itemType === 'CONSIGNMENT') {
        return `/consignments/${log.entityId}`
      }
      if (log.itemType === 'PRODUCT') {
        return `/products/${log.entityId}`
      }
      return `/items/${log.entityId}`
    }
    if (log.entityType === 'product') {
      return `/products/${log.entityId}`
    }
    if (log.entityType === 'consignment') {
      return `/consignments/${log.entityId}`
    }
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>変更履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>変更履歴</CardTitle>
      </CardHeader>
      <CardContent>
        {changeLogs.length === 0 ? (
          <p className="text-gray-500">変更履歴がありません</p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {changeLogs.map((log) => {
              const link = getEntityLink(log)
              const content = (
                <div className="p-3 border rounded hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={getActionBadgeVariant(log.action)}
                          className={
                            log.action === 'create'
                              ? 'bg-green-500 hover:bg-green-600'
                              : log.action === 'update'
                              ? 'bg-blue-500 hover:bg-blue-600'
                              : ''
                          }
                        >
                          {getActionLabel(log.action)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {log.entityType === 'item' && log.itemType === 'PRODUCT'
                            ? '商品'
                            : log.entityType === 'item' && log.itemType === 'CONSIGNMENT'
                              ? '委託品'
                              : getEntityTypeLabel(log.entityType)}
                        </span>
                      </div>
                      <div className="mt-1 font-medium truncate">
                        {log.entityName}
                        <span className="text-sm text-gray-500 ml-2">
                          ({log.entitySku})
                        </span>
                      </div>
                      {/* 編集の場合は変更内容を表示 */}
                      {log.action === 'update' && log.changes?.fields && log.changes.fields.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600 space-y-1">
                          {log.changes.fields.slice(0, 3).map((change, idx) => (
                            <div key={idx} className="flex items-center gap-1 text-xs">
                              <span className="text-gray-500">{change.label}:</span>
                              <span className="text-red-500 line-through truncate max-w-[80px]">
                                {change.from || '(なし)'}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="text-green-600 truncate max-w-[80px]">
                                {change.to || '(なし)'}
                              </span>
                            </div>
                          ))}
                          {log.changes.fields.length > 3 && (
                            <div className="text-xs text-gray-400">
                              他 {log.changes.fields.length - 3} 件の変更
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleDateString('ja-JP')}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{log.userName}</div>
                    </div>
                  </div>
                </div>
              )

              if (link) {
                return (
                  <Link key={log.id} href={link} className="block">
                    {content}
                  </Link>
                )
              }

              return <div key={log.id}>{content}</div>
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
