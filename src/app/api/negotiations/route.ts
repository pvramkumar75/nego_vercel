import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'

// Validation schema for negotiation data
const createNegotiationSchema = z.object({
  name: z.string().min(1, 'Negotiation name is required'),
  buyerName: z.string().min(1, 'Buyer name is required'),
  companyName: z.string().min(1, 'Company name is required'),
  currency: z.string().default('USD'),
  suppliers: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, 'Supplier name is required'),
    email: z.string().email('Invalid email format').optional().or(z.literal('')),
    representative: z.string().optional(),
    items: z.array(z.object({
      id: z.string(),
      name: z.string().min(1, 'Item name is required'),
      description: z.string().optional(),
      quantity: z.string().optional(),
      unit: z.string().optional(),
      terms: z.object({
        price: z.string().optional(),
        quotedPrice: z.string().optional(),
        paymentTerms: z.string().optional(),
        freight: z.string().optional(),
        deliverySchedule: z.string().optional(),
        warranty: z.string().optional(),
        ldClause: z.string().optional(),
      })
    })).min(1, 'At least one item is required')
  })).min(1, 'At least one supplier is required')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input data
    const validatedData = createNegotiationSchema.parse(body)
    const { name, buyerName, companyName, currency, suppliers } = validatedData

    // Create a unique link for the negotiation
    const uniqueLink = uuidv4()

    // Create or find buyer (for demo, we'll use a fixed buyer)
    let buyer = await db.user.findFirst({
      where: { email: 'buyer@demo.com' }
    })

    if (!buyer) {
      buyer = await db.user.create({
        data: {
          email: 'buyer@demo.com',
          name: buyerName || 'Demo Buyer'
        }
      })
    }

    // Create the negotiation
    const negotiation = await db.negotiation.create({
      data: {
        name,
        buyerId: buyer.id,
        buyerName,
        companyName,
        currency: currency || 'USD',
        uniqueLink
      }
    })

    // Create suppliers and their items with terms
    for (const supplierData of suppliers) {
      const supplier = await db.supplier.create({
        data: {
          negotiationId: negotiation.id,
          name: supplierData.name,
          email: supplierData.email || null,
          representative: supplierData.representative || null
        }
      })

      // Create items and their terms for each supplier
      for (const itemData of supplierData.items) {
        const item = await db.item.create({
          data: {
            negotiationId: negotiation.id,
            supplierId: supplier.id,
            name: itemData.name,
            description: itemData.description || null,
            quantity: itemData.quantity || null,
            unit: itemData.unit || null
          }
        })

        // Create terms for the item
        const terms = itemData.terms
        if (terms.price) {
          await db.negotiationTerm.create({
            data: {
              negotiationId: negotiation.id,
              itemId: item.id,
              termType: 'PRICE',
              targetValue: terms.price
            }
          })
        }

        if (terms.quotedPrice) {
          await db.negotiationTerm.create({
            data: {
              negotiationId: negotiation.id,
              itemId: item.id,
              termType: 'QUOTED_PRICE',
              targetValue: terms.quotedPrice
            }
          })
        }

        if (terms.paymentTerms) {
          await db.negotiationTerm.create({
            data: {
              negotiationId: negotiation.id,
              itemId: item.id,
              termType: 'PAYMENT_TERMS',
              targetValue: terms.paymentTerms
            }
          })
        }

        if (terms.freight) {
          await db.negotiationTerm.create({
            data: {
              negotiationId: negotiation.id,
              itemId: item.id,
              termType: 'FREIGHT',
              targetValue: terms.freight
            }
          })
        }

        if (terms.deliverySchedule) {
          await db.negotiationTerm.create({
            data: {
              negotiationId: negotiation.id,
              itemId: item.id,
              termType: 'DELIVERY_SCHEDULE',
              targetValue: terms.deliverySchedule
            }
          })
        }

        if (terms.warranty) {
          await db.negotiationTerm.create({
            data: {
              negotiationId: negotiation.id,
              itemId: item.id,
              termType: 'WARRANTY',
              targetValue: terms.warranty
            }
          })
        }

        if (terms.ldClause) {
          await db.negotiationTerm.create({
            data: {
              negotiationId: negotiation.id,
              itemId: item.id,
              termType: 'LD_CLAUSE',
              targetValue: terms.ldClause
            }
          })
        }
      }
    }

    // Fetch the complete negotiation with all relations
    const completeNegotiation = await db.negotiation.findUnique({
      where: { id: negotiation.id },
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

    return NextResponse.json({ 
      success: true, 
      uniqueLink: negotiation.uniqueLink,
      negotiationId: negotiation.id,
      negotiation: completeNegotiation
    })
  } catch (error) {
    console.error('Error creating negotiation:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to create negotiation', details: errorMessage },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const negotiations = await db.negotiation.findMany({
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
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ negotiations })
  } catch (error) {
    console.error('Error fetching negotiations:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch negotiations', details: errorMessage },
      { status: 500 }
    )
  }
}