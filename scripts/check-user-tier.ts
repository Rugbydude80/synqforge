import { db } from '../lib/db/index'
import { users, organizations, subscriptions, projects } from '../lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { count } from 'drizzle-orm'

async function checkUserTier() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: tsx scripts/check-user-tier.ts <email>');
    process.exit(1);
  }

  try {
    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    console.log('\n📧 User:', user.email);
    console.log('👤 User ID:', user.id);
    console.log('🏢 Org ID:', user.organizationId);
    console.log('🎭 Role:', user.role);
    
    // Get organization
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId));
    
    if (org) {
      console.log('\n🏢 Organization:', org.name);
      console.log('🎯 Tier:', org.tier);
    }
    
    // Get subscription
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, user.organizationId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    
    if (sub) {
      console.log('\n💳 Subscription:');
      console.log('  Status:', sub.status);
      console.log('  Stripe ID:', sub.stripeSubscriptionId);
      console.log('  Stripe Customer:', sub.stripeCustomerId);
    } else {
      console.log('\n💳 No subscription found');
    }
    
    // Count projects
    const [result] = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.organizationId, user.organizationId));
    
    console.log('\n📁 Projects:', result?.count || 0);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkUserTier();
