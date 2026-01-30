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

/** 全フィルタデータを一括取得するfetcher */
async function fetchAllFilters(): Promise<FiltersData> {
  const [categoriesRes, manufacturersRes, locationsRes, unitsRes, tagsRes] =
    await Promise.all([
      fetch('/api/categories'),
      fetch('/api/manufacturers'),
      fetch('/api/locations'),
      fetch('/api/units'),
      fetch('/api/tags'),
    ])

  const [categoriesData, manufacturersData, locationsData, unitsData, tagsData] =
    await Promise.all([
      categoriesRes.ok ? categoriesRes.json() : { categories: [] },
      manufacturersRes.ok ? manufacturersRes.json() : { manufacturers: [] },
      locationsRes.ok ? locationsRes.json() : { locations: [] },
      unitsRes.ok ? unitsRes.json() : { units: [] },
      tagsRes.ok ? tagsRes.json() : { tags: [] },
    ])

  return {
    categories: categoriesData.categories || [],
    manufacturers: manufacturersData.manufacturers || [],
    locations: locationsData.locations || [],
    units: unitsData.units || [],
    tags: tagsData.tags || [],
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
      dedupingInterval: 300000, // 5分間キャッシュ
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
