import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uniqueLink: string }> }
) {
  try {
    const { uniqueLink } = await params

    const negotiation = await db.negotiation.findUnique({
      where: { uniqueLink },
      include: {
        buyer: true,
        messages: {
          orderBy: { timestamp: 'asc' }
        },
        terms: {
          orderBy: { termType: 'asc' }
        },
        items: {
          include: {
            terms: {
              orderBy: { termType: 'asc' }
            },
            supplier: true
          },
          orderBy: { createdAt: 'asc' }
        },
        suppliers: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!negotiation) {
      return NextResponse.json(
        { error: 'Negotiation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ negotiation })
  } catch (error) {
    console.error('Error fetching negotiation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch negotiation' },
      { status: 500 }
    )
  }
}