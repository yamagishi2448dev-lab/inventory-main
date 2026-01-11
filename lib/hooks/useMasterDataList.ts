'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { NamedEntityWithCount } from '@/lib/types'

type MasterDataAction = 'list' | 'create' | 'update' | 'delete'

interface MasterDataConfig {
  endpoint: string
  responseKey: string
  entityLabel: string
  messages?: Partial<Record<MasterDataAction, string>>
}

interface MasterDataResult<T extends NamedEntityWithCount> {
  items: T[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  createItem: (name: string) => Promise<void>
  updateItem: (id: string, name: string) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  setError: (message: string | null) => void
}

const defaultMessages: Record<MasterDataAction, (label: string) => string> = {
  list: (label) => `${label}一覧の取得に失敗しました`,
  create: (label) => `${label}の作成に失敗しました`,
  update: (label) => `${label}の更新に失敗しました`,
  delete: (label) => `${label}の削除に失敗しました`,
}

async function readJson(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export function useMasterDataList<T extends NamedEntityWithCount>({
  endpoint,
  responseKey,
  entityLabel,
  messages,
}: MasterDataConfig): MasterDataResult<T> {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initialLoadRef = useRef(true)
  const messagesRef = useRef(messages)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const fetchItems = useCallback(async (withLoading = false) => {
    const shouldToggleLoading = withLoading || initialLoadRef.current
    if (shouldToggleLoading) {
      setLoading(true)
    }

    try {
      const response = await fetch(endpoint)
      if (!response.ok) {
        throw new Error(messagesRef.current?.list || defaultMessages.list(entityLabel))
      }
      const data = await response.json()
      const nextItems = data?.[responseKey]
      setItems(Array.isArray(nextItems) ? nextItems : [])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : messagesRef.current?.list || defaultMessages.list(entityLabel)
      )
    } finally {
      if (shouldToggleLoading) {
        setLoading(false)
      }
      initialLoadRef.current = false
    }
  }, [endpoint, responseKey, entityLabel])

  useEffect(() => {
    fetchItems(true)
  }, [fetchItems])

  const createItem = useCallback(async (name: string) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await readJson(response)
    if (!response.ok) {
      throw new Error(
        data?.error ||
          messagesRef.current?.create ||
          defaultMessages.create(entityLabel)
      )
    }
  }, [endpoint, entityLabel])

  const updateItem = useCallback(async (id: string, name: string) => {
    const response = await fetch(`${endpoint}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await readJson(response)
    if (!response.ok) {
      throw new Error(
        data?.error ||
          messagesRef.current?.update ||
          defaultMessages.update(entityLabel)
      )
    }
  }, [endpoint, entityLabel])

  const deleteItem = useCallback(async (id: string) => {
    const response = await fetch(`${endpoint}/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      throw new Error(
        messagesRef.current?.delete || defaultMessages.delete(entityLabel)
      )
    }
  }, [endpoint, entityLabel])

  const refresh = useCallback(async () => {
    await fetchItems(false)
  }, [fetchItems])

  return {
    items,
    loading,
    error,
    refresh,
    createItem,
    updateItem,
    deleteItem,
    setError,
  }
}
