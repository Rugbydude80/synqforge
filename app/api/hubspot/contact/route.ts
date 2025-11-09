/**
 * HubSpot Contact API Route
 * 
 * POST /api/hubspot/contact
 * 
 * Creates or updates a contact in HubSpot CRM.
 * Used for syncing user data from SynqForge to HubSpot.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createOrUpdateContact, createDeal, addTimelineEvent } from '@/lib/services/hubspot.service'
import { isHubSpotEnabled } from '@/lib/services/hubspot.service'

const contactSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  website: z.string().optional(),
  plan: z.enum(['free', 'solo', 'team', 'pro', 'enterprise']).optional(),
  organizationId: z.string().optional(),
  userId: z.string().optional(),
  // Allow custom properties
}).passthrough()

/**
 * POST /api/hubspot/contact
 * 
 * Creates or updates a contact in HubSpot
 */
export async function POST(req: NextRequest) {
  try {
    // Check if HubSpot is enabled
    if (!isHubSpotEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: 'HubSpot integration is not configured',
          message: 'HUBSPOT_ACCESS_TOKEN environment variable is not set',
        },
        { status: 503 }
      )
    }

    const body = await req.json()
    
    // Validate input
    let validatedData
    try {
      validatedData = contactSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        )
      }
      throw error
    }

    // Prepare contact properties
    const contactProperties = {
      email: validatedData.email,
      firstname: validatedData.firstname,
      lastname: validatedData.lastname,
      phone: validatedData.phone,
      company: validatedData.company,
      website: validatedData.website,
      // Add custom properties
      synqforge_plan: validatedData.plan,
      synqforge_organization_id: validatedData.organizationId,
      synqforge_user_id: validatedData.userId,
      // Set lifecycle stage based on plan
      lifecyclestage: validatedData.plan === 'free' ? 'subscriber' as const : 'lead' as const,
    }

    // Create or update contact
    const result = await createOrUpdateContact(contactProperties)

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create or update HubSpot contact',
          message: 'HubSpot API request failed. Check server logs for details.',
        },
        { status: 500 }
      )
    }

    // Optionally create a deal for paid plans
    let dealId: string | null = null
    if (validatedData.plan && validatedData.plan !== 'free' && result.isNew) {
      const dealName = `SynqForge ${validatedData.plan.charAt(0).toUpperCase() + validatedData.plan.slice(1)} Plan`
      dealId = await createDeal(
        result.contactId,
        dealName,
        undefined, // Amount can be set based on plan pricing
        'appointmentscheduled'
      )
    }

    // Add timeline event
    if (result.isNew) {
      await addTimelineEvent(
        result.contactId,
        'CUSTOM',
        `New user signed up for ${validatedData.plan || 'free'} plan`,
        new Date()
      )
    }

    return NextResponse.json({
      success: true,
      contactId: result.contactId,
      isNew: result.isNew,
      dealId,
      message: result.isNew 
        ? 'Contact created successfully in HubSpot' 
        : 'Contact updated successfully in HubSpot',
    })

  } catch (error) {
    console.error('HubSpot contact API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}

