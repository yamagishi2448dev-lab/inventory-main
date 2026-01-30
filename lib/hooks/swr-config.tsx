'use client'

import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('データの取得に失敗しました')
  }
  return res.json()
}

interface SWRProviderProps {
  children: ReactNode
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        fetcher,
        dedupingInterval: 60000, // 1分間は同じリクエストを重複排除
        revalidateOnFocus: false, // フォーカス時の再検証を無効化
        revalidateOnReconnect: false, // 再接続時の再検証を無効化
        errorRetryCount: 2, // エラー時のリトライ回数
      }}
    >
      {children}
    </SWRConfig>
  )
}
