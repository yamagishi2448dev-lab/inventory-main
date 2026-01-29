import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'
import { masterDataResponse } from '@/lib/api/response'

export async function GET() {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const [categories, manufacturers, locations, units, tags] = await Promise.all([
      prisma.category.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.manufacturer.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.location.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.unit.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.tag.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ])

    return masterDataResponse({
      categories,
      manufacturers,
      locations,
      units,
      tags,
    })
  } catch (error) {
    console.error('Filters fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch filters.' },
      { status: 500 }
    )
  }
}
