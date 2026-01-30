'use client'

import useSWR from 'swr'
import type { Category, Manufacturer, Location, Unit, TagV2 } from '@/lib/types'

/** フィルターデータの状態 v2.2 */
interface FiltersData {
  categories: Category[]
  manufacturers: Manufacturer[]
  locations: Location[]
  units: Unit[]
  tags: TagV2[]
}

/** フィルターフックの戻り値 v2.0 */
interface UseFiltersResult extends FiltersData {
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/** 統合APIから全フィルタデータを取得するfetcher */
async function fetchAllFilters(): Promise<FiltersData> {
  const response = await fetch('/api/filters')

  if (!response.ok) {
    throw new Error('フィルターデータの取得に失敗しました')
  }

  const data = await response.json()

  return {
    categories: data.categories || [],
    manufacturers: data.manufacturers || [],
    locations: data.locations || [],
    units: data.units || [],
    tags: data.tags || [],
  }
}

/**
 * 品目・メーカー・場所・単位・タグのデータを取得するカスタムフック (v2.2 SWR版)
 * SWRによるキャッシュで重複リクエストを排除
 */
export function useFilters(): UseFiltersResult {
  const { data, error, isLoading, mutate } = useSWR<FiltersData>(
    'filters',
    fetchAllFilters,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1800000, // 30分間キャッシュ（パフォーマンス最適化）
    }
  )

  return {
    categories: data?.categories || [],
    manufacturers: data?.manufacturers || [],
    locations: data?.locations || [],
    units: data?.units || [],
    tags: data?.tags || [],
    loading: isLoading,
    error: error ? 'フィルタデータの取得に失敗しました' : null,
    refetch: async () => {
      await mutate()
    },
  }
}
