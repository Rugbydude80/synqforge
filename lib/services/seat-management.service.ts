/**
 * Seat Management Service
 * Handles seat allocation, tracking, and billing for workspace subscriptions
 */

import { db, generateId } from '@/lib/db'
import {
  organizationSeats,
  organizations,
  users,
  teamInvitations,
  stripeSubscriptions
} from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { SUBSCRIPTION_LIMITS } from '@/lib/constants'

export interface SeatInfo {
  includedSeats: number
  addonSeats: number
  activeSeats: number
  pendingInvites: number
  totalAvailableSeats: number
  usedSeats: number
  availableSeats: number
  seatPrice: number
  monthlyCost: number
}

export interface SeatUpdateResult {
  success: boolean
  message: string
  newAddonSeats?: number
  additionalCost?: number
}

/**
 * Get seat information for an organization
 */
export async function getOrganizationSeats(organizationId: string): Promise<SeatInfo | null> {
  try {
    // Get organization and subscription details
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!org) {
      return null
    }

    const tier = org.subscriptionTier || 'free'
    const limits = SUBSCRIPTION_LIMITS[tier as keyof typeof SUBSCRIPTION_LIMITS]

    // Get or create seat record
    let [seatRecord] = await db
      .select()
      .from(organizationSeats)
      .where(eq(organizationSeats.organizationId, organizationId))
      .limit(1)

    if (!seatRecord) {
      // Create initial seat record
      await db.insert(organizationSeats).values({
        id: generateId(),
        organizationId,
        includedSeats: limits.includedSeats,
        addonSeats: 0,
        activeSeats: 0,
        pendingInvites: 0,
      })

      seatRecord = {
        id: generateId(),
        organizationId,
        includedSeats: limits.includedSeats,
        addonSeats: 0,
        activeSeats: 0,
        pendingInvites: 0,
        lastSeatUpdate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }

    // Count active users
    const activeUsersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(
        and(
          eq(users.organizationId, organizationId),
          eq(users.isActive, true)
        )
      )

    const activeSeats = Number(activeUsersResult[0]?.count || 0)

    // Count pending invitations
    const pendingInvitesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.organizationId, organizationId),
          eq(teamInvitations.status, 'pending')
        )
      )

    const pendingInvites = Number(pendingInvitesResult[0]?.count || 0)

    // Update seat record if counts changed
    if (seatRecord.activeSeats !== activeSeats || seatRecord.pendingInvites !== pendingInvites) {
      await db
        .update(organizationSeats)
        .set({
          activeSeats,
          pendingInvites,
          lastSeatUpdate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(organizationSeats.id, seatRecord.id))
    }

    const totalAvailableSeats = seatRecord.includedSeats + seatRecord.addonSeats
    const usedSeats = activeSeats + pendingInvites
    const availableSeats = totalAvailableSeats - usedSeats
    const seatPrice = limits.seatPrice
    const monthlyCost = seatRecord.addonSeats * seatPrice

    return {
      includedSeats: seatRecord.includedSeats,
      addonSeats: seatRecord.addonSeats,
      activeSeats,
      pendingInvites,
      totalAvailableSeats,
      usedSeats,
      availableSeats,
      seatPrice,
      monthlyCost,
    }
  } catch (error) {
    console.error('Error getting organization seats:', error)
    return null
  }
}

/**
 * Check if organization can add a new seat
 */
export async function canAddSeat(organizationId: string): Promise<boolean> {
  const seatInfo = await getOrganizationSeats(organizationId)
  if (!seatInfo) {
    return false
  }

  return seatInfo.availableSeats > 0
}

/**
 * Reserve a seat for a new user or invitation
 */
export async function reserveSeat(organizationId: string): Promise<SeatUpdateResult> {
  const seatInfo = await getOrganizationSeats(organizationId)

  if (!seatInfo) {
    return {
      success: false,
      message: 'Organization not found',
    }
  }

  if (seatInfo.availableSeats > 0) {
    return {
      success: true,
      message: 'Seat available',
    }
  }

  // Check if organization can add addon seats
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)

  const tier = org.subscriptionTier || 'free'

  if (tier === 'free') {
    return {
      success: false,
      message: `Free plan is limited to ${seatInfo.includedSeats} seats. Please upgrade to add more users.`,
    }
  }

  // Automatically add addon seat for paid tiers
  return await addAddonSeats(organizationId, 1)
}

/**
 * Add addon seats to an organization
 */
export async function addAddonSeats(
  organizationId: string,
  numberOfSeats: number
): Promise<SeatUpdateResult> {
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!org) {
      return {
        success: false,
        message: 'Organization not found',
      }
    }

    const tier = org.subscriptionTier || 'free'

    if (tier === 'free') {
      return {
        success: false,
        message: 'Cannot add addon seats to free plan',
      }
    }

    const limits = SUBSCRIPTION_LIMITS[tier as keyof typeof SUBSCRIPTION_LIMITS]
    const seatPrice = limits.seatPrice

    // Get current seat record
    const [seatRecord] = await db
      .select()
      .from(organizationSeats)
      .where(eq(organizationSeats.organizationId, organizationId))
      .limit(1)

    if (!seatRecord) {
      return {
        success: false,
        message: 'Seat record not found',
      }
    }

    const newAddonSeats = seatRecord.addonSeats + numberOfSeats
    const additionalCost = numberOfSeats * seatPrice

    // Update seat record
    await db
      .update(organizationSeats)
      .set({
        addonSeats: newAddonSeats,
        lastSeatUpdate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(organizationSeats.id, seatRecord.id))

    // Note: Stripe billing update should be handled separately via webhook
    // when subscription is updated through Stripe UI or API

    return {
      success: true,
      message: `Added ${numberOfSeats} addon seat(s). Additional cost: £${additionalCost}/month`,
      newAddonSeats,
      additionalCost,
    }
  } catch (error) {
    console.error('Error adding addon seats:', error)
    return {
      success: false,
      message: 'Failed to add addon seats',
    }
  }
}

/**
 * Remove addon seats from an organization
 */
export async function removeAddonSeats(
  organizationId: string,
  numberOfSeats: number
): Promise<SeatUpdateResult> {
  try {
    const seatInfo = await getOrganizationSeats(organizationId)

    if (!seatInfo) {
      return {
        success: false,
        message: 'Organization not found',
      }
    }

    if (numberOfSeats > seatInfo.addonSeats) {
      return {
        success: false,
        message: 'Cannot remove more addon seats than currently allocated',
      }
    }

    const newAddonSeats = seatInfo.addonSeats - numberOfSeats
    const remainingTotalSeats = seatInfo.includedSeats + newAddonSeats

    // Check if removing seats would leave insufficient capacity
    if (remainingTotalSeats < seatInfo.usedSeats) {
      return {
        success: false,
        message: `Cannot remove seats. You have ${seatInfo.usedSeats} active users/invites but would only have ${remainingTotalSeats} seats remaining.`,
      }
    }

    // Update seat record
    const [seatRecord] = await db
      .select()
      .from(organizationSeats)
      .where(eq(organizationSeats.organizationId, organizationId))
      .limit(1)

    if (!seatRecord) {
      return {
        success: false,
        message: 'Seat record not found',
      }
    }

    await db
      .update(organizationSeats)
      .set({
        addonSeats: newAddonSeats,
        lastSeatUpdate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(organizationSeats.id, seatRecord.id))

    const costReduction = numberOfSeats * seatInfo.seatPrice

    return {
      success: true,
      message: `Removed ${numberOfSeats} addon seat(s). Monthly cost reduced by £${costReduction}`,
      newAddonSeats,
      additionalCost: -costReduction,
    }
  } catch (error) {
    console.error('Error removing addon seats:', error)
    return {
      success: false,
      message: 'Failed to remove addon seats',
    }
  }
}

/**
 * Sync seats from Stripe subscription
 */
export async function syncSeatsFromStripe(organizationId: string): Promise<void> {
  try {
    const [subscription] = await db
      .select()
      .from(stripeSubscriptions)
      .where(eq(stripeSubscriptions.organizationId, organizationId))
      .limit(1)

    if (!subscription) {
      return
    }

    const [seatRecord] = await db
      .select()
      .from(organizationSeats)
      .where(eq(organizationSeats.organizationId, organizationId))
      .limit(1)

    if (!seatRecord) {
      return
    }

    // Update seats based on Stripe subscription
    await db
      .update(organizationSeats)
      .set({
        includedSeats: subscription.includedSeats || seatRecord.includedSeats,
        addonSeats: subscription.addonSeats || 0,
        lastSeatUpdate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(organizationSeats.id, seatRecord.id))
  } catch (error) {
    console.error('Error syncing seats from Stripe:', error)
  }
}
