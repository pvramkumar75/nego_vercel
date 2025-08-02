import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Server } from 'socket.io'

// Get Socket.io server instance
let io: Server | null = null

export const setSocketIO = (socketIO: Server) => {
  io = socketIO
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uniqueLink: string }> }
) {
  try {
    const { uniqueLink } = await params

    // Find the negotiation
    const negotiation = await db.negotiation.findUnique({
      where: { uniqueLink },
      include: {
        terms: true,
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 5 // Get last 5 messages to determine agreed terms
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
        { error: 'Negotiation already concluded' },
        { status: 400 }
      )
    }

    // Update negotiation status
    const updatedNegotiation = await db.negotiation.update({
      where: { id: negotiation.id },
      data: {
        status: 'CONCLUDED',
        concludedAt: new Date()
      }
    })

    // Add system message
    const concludeMessage = await db.message.create({
      data: {
        content: 'This negotiation has been concluded. Thank you for your participation.',
        role: 'SYSTEM',
        negotiationId: negotiation.id
      }
    })

    // Emit socket events for real-time updates
    if (io) {
      // Emit new message
      io.to(`negotiation-${negotiation.id}`).emit('new-message', concludeMessage)
      
      // Emit status update
      io.to(`negotiation-${negotiation.id}`).emit('negotiation-status-changed', {
        negotiationId: negotiation.id,
        status: 'CONCLUDED',
        concludedAt: new Date().toISOString()
      })
      
      console.log(`Socket events emitted for concluded negotiation ${negotiation.id}`)
    }

    return NextResponse.json({ 
      success: true, 
      negotiation: updatedNegotiation,
      message: concludeMessage
    })
  } catch (error) {
    console.error('Error concluding negotiation:', error)
    return NextResponse.json(
      { error: 'Failed to conclude negotiation' },
      { status: 500 }
    )
  }
}