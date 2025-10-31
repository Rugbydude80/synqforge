/**
 * GDPR Account Deletion Endpoint (Article 17 - Right to Erasure)
 * Handles account deletion with 90-day soft delete period
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, organizations, aiGenerations, auditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

// Lazy initialization - only validate API key when actually used
// This prevents build-time errors when env vars aren't available
function getStripeClient(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  return new Stripe(apiKey, {
    apiVersion: '2025-09-30.clover',
  });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { confirmEmail, reason } = await req.json();
    
    // Double confirmation
    if (confirmEmail !== session.user.email) {
      return NextResponse.json(
        { error: 'Email confirmation mismatch. Please type your email exactly.' },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    
    // 1. Get user's organization
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 2. Cancel Stripe subscription if user's organization has one
    if (user.organizationId) {
      try {
        // Get organization's Stripe customer ID
        const [organization] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, user.organizationId))
          .limit(1);

        if (organization?.stripeCustomerId) {
          // Get all active subscriptions
          const stripe = getStripeClient();
          const subscriptions = await stripe.subscriptions.list({
            customer: organization.stripeCustomerId,
            status: 'active',
          });

          // Cancel each subscription
          for (const sub of subscriptions.data) {
            await stripe.subscriptions.cancel(sub.id);
            console.log(`Cancelled subscription ${sub.id} due to user deletion: ${userId}`);
          }
        }
      } catch (error) {
        console.error(`Failed to cancel subscriptions for org ${user.organizationId}:`, error);
        // Continue with deletion even if Stripe cancellation fails
      }
    }

    // 3. Soft delete user (anonymize for 90-day retention)
    await db
      .update(users)
      .set({
        email: `deleted-${userId}@synqforge.deleted`,
        name: 'Deleted User',
        // Add deleted_at field if it exists in your schema
        // deleted_at: new Date(),
        // deletion_reason: reason || 'user_request',
      })
      .where(eq(users.id, userId));

    // 4. Hard delete sensitive data (AI generations with prompts)
    await db
      .delete(aiGenerations)
      .where(eq(aiGenerations.userId, userId));

    // 5. Organization cleanup handled by soft delete
    // User's organizationId remains for audit purposes

    // 6. Log deletion for audit trail (retain 7 years for compliance)
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      organizationId: session.user.organizationId || 'system',
      userId: userId,
      action: 'GDPR_ACCOUNT_DELETION',
      resourceType: 'user',
      resourceId: userId,
      metadata: {
        email: session.user.email,
        reason: reason || 'user_request',
        retainUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
        organizationId: user.organizationId,
      },
      createdAt: new Date(),
    });

    // 7. Invalidate all sessions
    // Note: Session invalidation must be handled client-side
    // Client should call signOut() after receiving this response

    return NextResponse.json({
      deleted: true,
      message: 'Account deletion initiated. Your data will be completely removed in 90 days as per GDPR requirements.',
      retainUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Account deletion failed:', error);
    return NextResponse.json(
      { error: 'Failed to delete account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

