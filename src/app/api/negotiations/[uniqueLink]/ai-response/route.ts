import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uniqueLink: string }> }
) {
  try {
    const { uniqueLink } = await params
    const { message, negotiationId } = await request.json()

    // Find the negotiation with all related data
    const negotiation = await db.negotiation.findUnique({
      where: { uniqueLink },
      include: {
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
        },
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 10 // Get last 10 messages for context
        }
      }
    })

    if (!negotiation) {
      return NextResponse.json(
        { error: 'Negotiation not found' },
        { status: 404 }
      )
    }

    if (negotiation.status === 'CONCLUDED') {
      return NextResponse.json(
        { error: 'Negotiation has been concluded' },
        { status: 400 }
      )
    }

    // Get all terms from negotiation and items
    const allTerms = [
      ...(negotiation.terms || []),
      ...(negotiation.items?.flatMap(item => item.terms) || [])
    ]
    
    // Group terms by type for better context
    const termsByType = allTerms.reduce((acc, term) => {
      if (!acc[term.termType]) {
        acc[term.termType] = []
      }
      acc[term.termType].push(term)
      return acc
    }, {} as Record<string, typeof allTerms>)
    
    // Prepare negotiation context for AI
    const termsContext = Object.entries(termsByType)
      .map(([termType, terms]) => {
        const termTypeDisplay = termType.replace('_', ' ')
        return terms.map((term, index) => {
          const itemInfo = term.itemId ? ` (Item ${index + 1})` : ''
          const quotedInfo = term.quotedValue ? ` | Quoted: ${term.quotedValue}` : ''
          const agreedInfo = term.agreedValue ? ` | Agreed: ${term.agreedValue}` : ''
          return `${termTypeDisplay}${itemInfo} - Target: ${term.targetValue}${quotedInfo}${agreedInfo}`
        }).join('\n')
      })
      .join('\n')

    // Prepare supplier and item context
    const suppliersContext = negotiation.suppliers?.map((supplier, index) => {
      const supplierItems = negotiation.items?.filter(item => item.supplierId === supplier.id) || []
      const itemsList = supplierItems.map(item => `- ${item.name}${item.quantity ? ` (${item.quantity} ${item.unit || 'units'})` : ''}`).join('\n  ')
      return `Supplier ${index + 1}: ${supplier.name}${supplier.representative ? ` - ${supplier.representative}` : ''}${supplier.email ? ` (${supplier.email})` : ''}\n  Items:\n  ${itemsList || '  No items specified'}`
    }).join('\n\n') || 'No suppliers specified'

    const recentMessages = negotiation.messages
      .map(msg => `${msg.role.replace('_', ' ')}: ${msg.content}`)
      .join('\n')

    // Count messages to determine negotiation stage
    const messageCount = negotiation.messages.length
    const isEarlyStage = messageCount <= 6

    // Create AI negotiation prompt
    const systemPrompt = `You are a professional AI negotiation assistant representing ${negotiation.buyerName || 'a buyer'} from ${negotiation.companyName || 'the company'} in a supplier negotiation. Your goal is to negotiate the best possible terms while maintaining a positive and professional relationship.

Suppliers and Items:
${suppliersContext}

Current negotiation terms:
${termsContext}

Recent conversation:
${recentMessages}

Negotiation stage: ${isEarlyStage ? 'Early stage (stand firm on targets)' : 'Later stage (more flexible)'}

Guidelines:
1. Be professional, polite, and constructive
2. Focus on finding mutually beneficial solutions
3. Use clear, business-appropriate language
4. ${isEarlyStage ? 'Stand firm on target prices and terms for the first 6 messages' : 'Be more willing to compromise within reasonable limits'}
5. Always maintain a collaborative tone
6. Respond to the supplier's specific points and concerns
7. Keep responses SHORT, PRECISE, and POINT-WISE
8. Start with PRICE/QUOTED_PRICE terms first, then move to other terms
9. Use bullet points for clarity
10. Each point should be clear and concise
11. Work towards reaching agreements on each term
12. Add market research insights when countering supplier offers
13. Never use asterisks (*) in your messages
14. For early stage negotiations, provide logical reasons for holding firm on targets
15. Reference specific items and suppliers when discussing terms

The supplier just said: "${message}"

Please provide a SHORT, PRECISE response that:
- Starts with price/quoted price discussion
- Uses bullet points (•) for each point
- Is concise and to the point
- Moves the negotiation forward effectively
- ${isEarlyStage ? 'Stands firm on targets with logical reasoning' : 'Shows more flexibility'}
- Includes market insights when relevant
- Avoids using asterisks
- References specific items and suppliers when applicable

Format your response as:
• [Point about price/quoted price with market insight if relevant]
• [Point about payment terms if relevant]
• [Point about other terms if relevant]
• [Next step or question]`

    try {
      const zai = await ZAI.create()
      
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })

      const aiResponse = completion.choices[0]?.message?.content || 
        '• Thank you for your proposal\n• Let me review your terms\n• I will respond with our position shortly\n• Looking forward to reaching an agreement'

      // Clean up any asterisks that might slip through
      const cleanedResponse = aiResponse.replace(/\*/g, '')

      // Save the AI response
      const aiMessage = await db.message.create({
        data: {
          content: cleanedResponse,
          role: 'AI_BOT',
          negotiationId: negotiation.id
        }
      })

      return NextResponse.json(aiMessage)
    } catch (aiError) {
      console.error('AI service error:', aiError)
      
      // Fallback response if AI service fails
      const fallbackMessage = await db.message.create({
        data: {
          content: 'Technical issue detected\n• Please give me a moment to resolve\n• I will respond to your points shortly\n• Thank you for your patience',
          role: 'AI_BOT',
          negotiationId: negotiation.id
        }
      })

      return NextResponse.json(fallbackMessage)
    }
  } catch (error) {
    console.error('Error generating AI response:', error)
    return NextResponse.json(
      { error: 'Failed to generate AI response' },
      { status: 500 }
    )
  }
}