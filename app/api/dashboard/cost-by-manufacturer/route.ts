import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'

export async function GET(request: Request) {
    const auth = await authenticateRequest()
    if (!auth.success) {
        return auth.response
    }

    const { searchParams } = new URL(request.url)
    const sort = searchParams.get('sort') === 'asc' ? 'asc' : 'desc'

    try {
        const manufacturers = await prisma.manufacturer.findMany({
            select: {
                id: true,
                name: true,
                products: {
                    select: {
                        costPrice: true,
                        quantity: true,
                    }
                }
            }
        })

        const data = manufacturers.map(m => {
            const totalCost = m.products.reduce((sum, p) => {
                return sum + (Number(p.costPrice) * p.quantity)
            }, 0)

            return {
                manufacturerId: m.id,
                manufacturerName: m.name,
                totalCost
            }
        })
            .filter(item => item.totalCost > 0) // 原価合計が0のメーカーは除外（オプション）
            .sort((a, b) => {
                if (sort === 'asc') {
                    return a.totalCost - b.totalCost
                } else {
                    return b.totalCost - a.totalCost
                }
            })
            .map(item => ({
                ...item,
                totalCost: item.totalCost.toFixed(2)
            }))

        return NextResponse.json({ data })

    } catch (error) {
        console.error('メーカー別原価取得エラー:', error)
        return NextResponse.json(
            { error: 'データの取得に失敗しました' },
            { status: 500 }
        )
    }
}
