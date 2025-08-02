import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    // Delete all messages first (due to foreign key constraint)
    await db.message.deleteMany({})
    
    // Delete all negotiation terms
    await db.negotiationTerm.deleteMany({})
    
    // Delete all negotiations
    await db.negotiation.deleteMany({})
    
    console.log('Database cleaned successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database cleaned successfully' 
    })
  } catch (error) {
    console.error('Error cleaning database:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to clean database', details: errorMessage },
      { status: 500 }
    )
  }
}