import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Check database connectivity
    await db.$queryRaw`SELECT 1`
    
    // Check environment
    const env = process.env.NODE_ENV || 'development'
    
    // Check database stats
    const negotiationCount = await db.negotiation.count()
    const userCount = await db.user.count()
    const messageCount = await db.message.count()
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env,
      database: {
        connected: true,
        negotiations: negotiationCount,
        users: userCount,
        messages: messageCount
      },
      version: '1.0.0'
    })
  } catch (error) {
    console.error('Health check failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: errorMessage 
      },
      { status: 500 }
    )
  }
}