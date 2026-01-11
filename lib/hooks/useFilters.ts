'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Category, Manufacturer, Location, Unit } from '@/lib/types'

/** フィルターデータの状態 v2.0 */
interface FiltersData {
    categories: Category[]
    manufacturers: Manufacturer[]
    locations: Location[]
    units: Unit[]
}

/** フィルターフックの戻り値 v2.0 */
interface UseFiltersResult extends FiltersData {
    loading: boolean
    error: string | null
    refetch: () => Promise<void>
}

/**
 * 品目・メーカー・場所・単位のデータを取得するカスタムフック (v2.0)
 * 複数のコンポーネントで重複していたフェッチ処理を共通化
 */
export function useFilters(): UseFiltersResult {
    const [categories, setCategories] = useState<Category[]>([])
    const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [units, setUnits] = useState<Unit[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchFilters = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const [categoriesRes, manufacturersRes, locationsRes, unitsRes] = await Promise.all([
                fetch('/api/categories'),
                fetch('/api/manufacturers'),
                fetch('/api/locations'),
                fetch('/api/units'),
            ])

            if (categoriesRes.ok) {
                const data = await categoriesRes.json()
                setCategories(data.categories)
            }

            if (manufacturersRes.ok) {
                const data = await manufacturersRes.json()
                setManufacturers(data.manufacturers)
            }

            if (locationsRes.ok) {
                const data = await locationsRes.json()
                setLocations(data.locations)
            }

            if (unitsRes.ok) {
                const data = await unitsRes.json()
                setUnits(data.units)
            }

            // いずれかのリクエストが失敗した場合
            if (!categoriesRes.ok || !manufacturersRes.ok || !locationsRes.ok || !unitsRes.ok) {
                console.warn('一部のフィルタデータの取得に失敗しました')
            }
        } catch (err) {
            console.error('フィルタデータの取得に失敗しました:', err)
            setError('フィルタデータの取得に失敗しました')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchFilters()
    }, [fetchFilters])

    return {
        categories,
        manufacturers,
        locations,
        units,
        loading,
        error,
        refetch: fetchFilters,
    }
}
