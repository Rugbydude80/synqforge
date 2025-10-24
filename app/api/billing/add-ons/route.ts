/**
 * Add-Ons API Route
 * 
 * Handles purchasing and listing add-ons
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { purchaseAddOn, listActiveAddOns } from '@/lib/services/addOnService'
import { type AddOnType } from '@/lib/config/tiers'

// POST /api/billing/add-ons - Purchase an add-on
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await req.json()
    const { productId, addOnType, quantity = 1 } = body
    
    if (!addOnType) {
      return NextResponse.json(
        { error: 'Missing required field: addOnType' },
        { status: 400 }
      )
    }
    
    // Validate add-on type
    const validTypes: AddOnType[] = ['ai_actions', 'ai_booster', 'priority_support']
    if (!validTypes.includes(addOnType)) {
      return NextResponse.json(
        { error: `Invalid add-on type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }
    
    const result = await purchaseAddOn({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      addOnType: addOnType as AddOnType,
      quantity,
    })
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
      checkoutUrl: result.checkoutUrl,
    })
  } catch (error) {
    console.error('POST /api/billing/add-ons error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/billing/add-ons - List active add-ons
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const addOns = await listActiveAddOns(
      session.user.organizationId,
      session.user.id
    )
    
    return NextResponse.json({
      addOns,
      count: addOns.length,
    })
  } catch (error) {
    console.error('GET /api/billing/add-ons error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

