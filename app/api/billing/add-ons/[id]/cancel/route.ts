/**
 * Cancel Add-On API Route
 * 
 * Handles cancellation of recurring add-ons
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { cancelAddOn } from '@/lib/services/addOnService'

// POST /api/billing/add-ons/[id]/cancel - Cancel a recurring add-on
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { id: purchaseId } = params
    
    if (!purchaseId) {
      return NextResponse.json(
        { error: 'Missing purchase ID' },
        { status: 400 }
      )
    }
    
    const result = await cancelAddOn(
      purchaseId,
      session.user.organizationId,
      session.user.id
    )
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Add-on cancelled successfully. It will remain active until the end of the current billing period.',
    })
  } catch (error) {
    console.error('POST /api/billing/add-ons/[id]/cancel error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

