/**
 * HubSpot Integration Service
 * 
 * Handles HubSpot CRM operations including contact creation, updates,
 * deal management, and webhook processing.
 * 
 * Required scopes:
 * - crm.objects.contacts.write
 * - crm.objects.contacts.read
 * - deals
 * - companies
 * - forms
 * - timeline
 * - tickets
 */

import { Client } from '@hubspot/api-client'
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/contacts/models/Filter'
import { AssociationSpecAssociationCategoryEnum } from '@hubspot/api-client/lib/codegen/crm/deals/models/AssociationSpec'

/**
 * Initialize HubSpot client with access token from environment
 */
function getHubSpotClient(): Client | null {
  const accessToken = process.env.HUBSPOT_ACCESS_TOKEN
  
  if (!accessToken) {
    console.warn('HubSpot access token not configured. HubSpot integration will be disabled.')
    return null
  }

  try {
    return new Client({ accessToken })
  } catch (error) {
    console.error('Failed to initialize HubSpot client:', error)
    return null
  }
}

/**
 * Contact properties interface
 * Supports standard HubSpot properties and custom properties
 */
export interface HubSpotContactProperties {
  email: string
  firstname?: string
  lastname?: string
  phone?: string
  company?: string
  website?: string
  lifecyclestage?: 'subscriber' | 'lead' | 'marketingqualifiedlead' | 'salesqualifiedlead' | 'opportunity' | 'customer' | 'evangelist' | 'other'
  // Custom properties (must be configured in HubSpot first)
  [key: string]: string | undefined
}

/**
 * Create or update a contact in HubSpot
 * 
 * @param properties - Contact properties
 * @returns HubSpot contact ID or null if failed
 */
export async function createOrUpdateContact(
  properties: HubSpotContactProperties
): Promise<{ contactId: string; isNew: boolean } | null> {
  const client = getHubSpotClient()
  
  if (!client) {
    return null
  }

  try {
    // Try to find existing contact by email
    const searchResponse = await client.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'email',
              operator: FilterOperatorEnum.Eq,
              value: properties.email,
            },
          ],
        },
      ],
      properties: ['email', 'firstname', 'lastname'],
      limit: 1,
    })

    const existingContact = searchResponse.results?.[0]

    if (existingContact) {
      // Update existing contact
      // Filter out undefined/null values and ensure all values are strings
      const cleanProperties: Record<string, string> = {}
      for (const [key, value] of Object.entries(properties)) {
        if (value !== undefined && value !== null) {
          cleanProperties[key] = String(value)
        }
      }
      
      await client.crm.contacts.basicApi.update(existingContact.id, {
        properties: cleanProperties,
      })

      console.log(`✅ Updated HubSpot contact: ${existingContact.id} (${properties.email})`)
      
      return {
        contactId: existingContact.id,
        isNew: false,
      }
    } else {
      // Create new contact
      // Filter out undefined/null values and ensure all values are strings
      const cleanProperties: Record<string, string> = {}
      for (const [key, value] of Object.entries(properties)) {
        if (value !== undefined && value !== null) {
          cleanProperties[key] = String(value)
        }
      }
      
      const createResponse = await client.crm.contacts.basicApi.create({
        properties: cleanProperties,
      })

      console.log(`✅ Created HubSpot contact: ${createResponse.id} (${properties.email})`)
      
      return {
        contactId: createResponse.id,
        isNew: true,
      }
    }
  } catch (error) {
    console.error('HubSpot contact creation/update failed:', error)
    
    // Log error details for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      if ('response' in error && error.response) {
        console.error('HubSpot API response:', JSON.stringify(error.response, null, 2))
      }
    }
    
    // Don't throw - allow the calling code to continue even if HubSpot fails
    return null
  }
}

/**
 * Create a deal associated with a contact
 * 
 * @param contactId - HubSpot contact ID
 * @param dealName - Name of the deal
 * @param amount - Deal amount (optional)
 * @param stage - Deal stage (optional)
 * @returns HubSpot deal ID or null if failed
 */
export async function createDeal(
  contactId: string,
  dealName: string,
  amount?: number,
  stage?: string
): Promise<string | null> {
  const client = getHubSpotClient()
  
  if (!client) {
    return null
  }

  try {
    const dealProperties: Record<string, string> = {
      dealname: dealName,
      dealstage: stage || 'appointmentscheduled',
    }
    
    if (amount !== undefined) {
      dealProperties.amount = amount.toString()
    }
    
    const dealResponse = await client.crm.deals.basicApi.create({
      properties: dealProperties,
      associations: [
        {
          to: { id: contactId },
          types: [{ associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined, associationTypeId: 3 }], // Contact to Deal association
        },
      ],
    })

    console.log(`✅ Created HubSpot deal: ${dealResponse.id} for contact ${contactId}`)
    
    return dealResponse.id
  } catch (error) {
    console.error('HubSpot deal creation failed:', error)
    return null
  }
}

/**
 * Add a timeline event to a contact
 * 
 * @param contactId - HubSpot contact ID
 * @param eventType - Type of event
 * @param message - Event message
 * @param timestamp - Event timestamp (defaults to now)
 */
export async function addTimelineEvent(
  contactId: string,
  eventType: string,
  message: string,
  timestamp?: Date
): Promise<boolean> {
  const client = getHubSpotClient()
  
  if (!client) {
    return false
  }

  try {
    await client.crm.timeline.eventsApi.create({
      eventTemplateId: eventType,
      objectId: contactId,
      utk: contactId, // User token/contact ID
      eventType: 'CUSTOM',
      extraData: {
        message,
        timestamp: timestamp?.toISOString() || new Date().toISOString(),
      },
    })

    console.log(`✅ Added timeline event to HubSpot contact: ${contactId}`)
    return true
  } catch (error) {
    console.error('HubSpot timeline event creation failed:', error)
    return false
  }
}

/**
 * Check if HubSpot integration is enabled
 */
export function isHubSpotEnabled(): boolean {
  return !!process.env.HUBSPOT_ACCESS_TOKEN
}

