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
        // DB側でGROUP BYとSORT（最適化）
        let data: Array<{
            manufacturerId: string,
            manufacturerName: string,
            totalCost: number
        }>

        if (sort === 'asc') {
            data = await prisma.$queryRaw`
                SELECT
                    m.id as "manufacturerId",
                    m.name as "manufacturerName",
                    COALESCE(SUM(p."costPrice" * p.quantity), 0) as "totalCost"
                FROM manufacturers m
                LEFT JOIN products p ON p."manufacturerId" = m.id
                GROUP BY m.id, m.name
                HAVING COALESCE(SUM(p."costPrice" * p.quantity), 0) > 0
                ORDER BY "totalCost" ASC
            `
        } else {
            data = await prisma.$queryRaw`
                SELECT
                    m.id as "manufacturerId",
                    m.name as "manufacturerName",
                    COALESCE(SUM(p."costPrice" * p.quantity), 0) as "totalCost"
                FROM manufacturers m
                LEFT JOIN products p ON p."manufacturerId" = m.id
                GROUP BY m.id, m.name
                HAVING COALESCE(SUM(p."costPrice" * p.quantity), 0) > 0
                ORDER BY "totalCost" DESC
            `
        }

        const formattedData = data.map(item => ({
            ...item,
            totalCost: Number(item.totalCost).toFixed(2)
        }))

        return NextResponse.json({ data: formattedData })

    } catch (error) {
        console.error('メーカー別原価取得エラー:', error)
        return NextResponse.json(
            { error: 'データの取得に失敗しました' },
            { status: 500 }
        )
    }
}
