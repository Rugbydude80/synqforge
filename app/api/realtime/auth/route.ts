/**
 * Ably Authentication Endpoint
 * Generates secure tokens for client-side Ably connections
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthContext } from '@/lib/middleware/auth'
import { realtimeService } from '@/lib/services/realtime.service'

async function handler(_request: NextRequest, context: AuthContext) {
  try {
    const { user } = context

    // Create client ID from user info
    const clientId = `user:${user.id}`

    // Generate Ably token request
    const tokenRequest = await realtimeService.createTokenRequest(clientId)

    return NextResponse.json({
      tokenRequest,
      clientId,
    })
  } catch (error) {
    console.error('Realtime auth error:', error)
    return NextResponse.json(
      { error: 'Failed to generate realtime token' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(handler)
