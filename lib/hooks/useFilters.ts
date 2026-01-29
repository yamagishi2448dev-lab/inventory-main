'use client'

import useSWR from 'swr'
import type { Category, Manufacturer, Location, Unit, TagV2 } from '@/lib/types'

/** 繝輔ぅ繝ｫ繧ｿ繝ｼ繝・・繧ｿ縺ｮ迥ｶ諷・v2.2 */
interface FiltersData {
    categories: Category[]
    manufacturers: Manufacturer[]
    locations: Location[]
    units: Unit[]
    tags: TagV2[]
}

/** 繝輔ぅ繝ｫ繧ｿ繝ｼ繝輔ャ繧ｯ縺ｮ謌ｻ繧雁､ v2.0 */
interface UseFiltersResult extends FiltersData {
    loading: boolean
    error: string | null
    refetch: () => Promise<void>
}

/** SWR fetcher髢｢謨ｰ */
const fetcher = (url: string) => fetch(url).then((res) => res.json())

/**
 * 蜩∫岼繝ｻ繝｡繝ｼ繧ｫ繝ｼ繝ｻ蝣ｴ謇繝ｻ蜊倅ｽ阪・繧ｿ繧ｰ縺ｮ繝・・繧ｿ繧貞叙蠕励☆繧九き繧ｹ繧ｿ繝繝輔ャ繧ｯ (v2.2)
 * SWR縺ｧ繧ｭ繝｣繝・す繝ｳ繧ｰ + 閾ｪ蜍募・讀懆ｨｼ
 */
export function useFilters(): UseFiltersResult {
    const { data, error, mutate } = useSWR<FiltersData>(
        '/api/filters',
        fetcher,
        {
            refreshInterval: 300000,
            dedupingInterval: 60000,
            revalidateOnFocus: false,
        }
    )

    const loading = !data

    const refetch = async () => {
        await mutate()
    }

    return {
        categories: data?.categories || [],
        manufacturers: data?.manufacturers || [],
        locations: data?.locations || [],
        units: data?.units || [],
        tags: data?.tags || [],
        loading,
        error: error ? '繝輔ぅ繝ｫ繧ｿ繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' : null,
        refetch,
    }
}
