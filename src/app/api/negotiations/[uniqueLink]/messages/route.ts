import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Server } from 'socket.io'

// Get Socket.io server instance (this would be properly initialized in your server setup)
let io: Server | null = null

// This is a simplified approach - in production, you'd properly inject the socket.io instance
export const setSocketIO = (socketIO: Server) => {
  io = socketIO
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uniqueLink: string }> }
) {
  try {
    const { uniqueLink } = await params
    const { content, role } = await request.json()

    // Find the negotiation
    const negotiation = await db.negotiation.findUnique({
      where: { uniqueLink }
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

    // Create the message
    const message = await db.message.create({
      data: {
        content,
        role,
        negotiationId: negotiation.id
      }
    })

    // Emit socket event for real-time updates
    if (io) {
      io.to(`negotiation-${negotiation.id}`).emit('new-message', message)
      console.log(`Socket event emitted for negotiation ${negotiation.id}`)
    }

    return NextResponse.json(message)
  } catch (error) {
    console.error('Error creating message:', error)
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    )
  }
}