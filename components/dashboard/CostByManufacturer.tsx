'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice } from '@/lib/utils'
import { ArrowUpDown } from 'lucide-react'

interface ManufacturerCost {
    manufacturerId: string
    manufacturerName: string
    totalCost: string
}

export function CostByManufacturer() {
    const [data, setData] = useState<ManufacturerCost[]>([])
    const [loading, setLoading] = useState(true)
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    const fetchData = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/dashboard/cost-by-manufacturer?sort=${sortOrder}`)
            if (res.ok) {
                const json = await res.json()
                setData(json.data)
            }
        } catch (error) {
            console.error('Failed to fetch manufacturer costs:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [sortOrder])

    const toggleSort = () => {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    }

    if (loading) {
        return (
            <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">メーカー別原価合計</CardTitle>
                    <Skeleton className="h-8 w-8 rounded-full" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 mt-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">メーカー別原価合計</CardTitle>
                <Button variant="ghost" size="icon" onClick={toggleSort} title={sortOrder === 'asc' ? '昇順' : '降順'}>
                    <ArrowUpDown className="h-4 w-4" />
                    <span className="sr-only">ソート切替</span>
                </Button>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-4">データがありません</p>
                ) : (
                    <div className="mt-2 border rounded-md bg-white/70">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50 border-b">
                            <div>メーカー</div>
                            <div className="text-right">原価合計</div>
                        </div>
                        <div className="max-h-[320px] overflow-y-auto divide-y pr-4">
                            {data.map((item) => (
                                <div key={item.manufacturerId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-3 py-2 text-sm items-center">
                                    <div className="font-medium whitespace-normal break-words leading-snug text-slate-700" title={item.manufacturerName}>
                                        {item.manufacturerName}
                                    </div>
                                    <div className="font-semibold text-slate-900 text-right tabular-nums min-w-[8.5rem]">
                                        {formatPrice(item.totalCost)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
