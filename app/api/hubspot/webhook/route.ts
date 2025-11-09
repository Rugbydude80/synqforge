/**
 * HubSpot Webhook Handler
 * 
 * POST /api/hubspot/webhook
 * 
 * Receives webhook events from HubSpot and processes them.
 * Supports signature validation using HUBSPOT_CLIENT_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * Verify HubSpot webhook signature
 * 
 * @param payload - Raw request body
 * @param signature - Signature from X-HubSpot-Signature-v3 header
 * @param clientSecret - HubSpot client secret
 * @returns true if signature is valid
 */
function verifySignature(
  payload: string,
  signature: string,
  clientSecret: string
): boolean {
  try {
    const hash = crypto
      .createHmac('sha256', clientSecret)
      .update(payload)
      .digest('hex')
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(hash)
    )
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

/**
 * POST /api/hubspot/webhook
 * 
 * Handles incoming webhook events from HubSpot
 */
export async function POST(req: NextRequest) {
  try {
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET

    if (!clientSecret) {
      console.warn('HubSpot client secret not configured. Webhook signature validation disabled.')
    }

    // Get raw body for signature verification
    const rawBody = await req.text()
    const signature = req.headers.get('X-HubSpot-Signature-v3') || 
                     req.headers.get('X-HubSpot-Signature-v2') ||
                     req.headers.get('X-HubSpot-Signature')

    // Verify signature if client secret is configured
    if (clientSecret && signature) {
      const isValid = verifySignature(rawBody, signature, clientSecret)
      
      if (!isValid) {
        console.error('Invalid HubSpot webhook signature')
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid signature',
            message: 'Webhook signature verification failed',
          },
          { status: 401 }
        )
      }
    }

    // Parse webhook payload
    let payload
    try {
      payload = JSON.parse(rawBody)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON payload',
          message: 'Failed to parse webhook payload',
        },
        { status: 400 }
      )
    }

    // Log webhook event for debugging
    console.log('📥 HubSpot webhook received:', {
      eventType: payload.subscriptionType || payload.eventType,
      objectId: payload.objectId,
      timestamp: new Date().toISOString(),
    })

    // Process different webhook event types
    const eventType = payload.subscriptionType || payload.eventType || 'unknown'
    
    switch (eventType) {
      case 'contact.creation':
      case 'contact.propertyChange':
        // Handle contact events
        console.log('Contact event:', payload)
        // TODO: Sync contact changes back to SynqForge if needed
        break

      case 'deal.creation':
      case 'deal.propertyChange':
        // Handle deal events
        console.log('Deal event:', payload)
        // TODO: Sync deal changes back to SynqForge if needed
        break

      default:
        console.log('Unhandled webhook event type:', eventType)
    }

    // Always return 200 to acknowledge receipt
    // HubSpot will retry if we return an error status
    return NextResponse.json({
      success: true,
      message: 'Webhook received and processed',
      eventType,
    })

  } catch (error) {
    console.error('HubSpot webhook error:', error)
    
    // Return 200 to prevent HubSpot from retrying
    // Log the error for manual investigation
    return NextResponse.json(
      {
        success: false,
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 200 } // Return 200 to acknowledge receipt even on error
    )
  }
}

