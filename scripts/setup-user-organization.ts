/**
 * Setup script to create organization and link user
 * Run with: npx tsx scripts/setup-user-organization.ts
 */

import { db } from '@/lib/db'
import { users, organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

async function setupUserOrganization() {
  try {
    console.log('🚀 Starting user and organization setup...\n')

    // Get user email from command line or use default
    const userEmail = process.argv[2] || process.env.USER_EMAIL

    if (!userEmail) {
      console.error('❌ Error: Please provide user email')
      console.log('Usage: npx tsx scripts/setup-user-organization.ts your@email.com')
      console.log('Or set USER_EMAIL environment variable')
      process.exit(1)
    }

    console.log(`📧 Looking for user: ${userEmail}`)

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1)

    if (!user) {
      console.error(`❌ User not found: ${userEmail}`)
      console.log('\n💡 Tip: User might not exist yet. Sign in once to create the user.')
      process.exit(1)
    }

    console.log(`✅ Found user: ${user.id}`)
    console.log(`   Name: ${user.name || 'Not set'}`)
    console.log(`   Current Org ID: ${user.organizationId || 'None'}\n`)

    // Check if user already has an organization
    if (user.organizationId) {
      const [existingOrg] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, user.organizationId))
        .limit(1)

      if (existingOrg) {
        console.log('✅ User already has an organization!')
        console.log(`   Org ID: ${existingOrg.id}`)
        console.log(`   Org Name: ${existingOrg.name}`)
        console.log(`   Org Slug: ${existingOrg.slug}`)
        console.log(`   Plan: ${existingOrg.plan || 'free'}`)
        console.log(`   Status: ${existingOrg.subscriptionStatus || 'active'}`)
        console.log('\n✨ Setup already complete!')
        return
      } else {
        console.log('⚠️  User has organizationId but organization not found. Creating new one...\n')
      }
    }

    // Create organization
    console.log('📝 Creating new organization...')
    
    const orgName = user.name ? `${user.name}'s Organization` : 'My Organization'
    const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    
    const [newOrg] = await db
      .insert(organizations)
      .values({
        name: orgName,
        slug: orgSlug,
        plan: 'free',
        subscriptionStatus: 'active',
        subscriptionTier: 'free',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    console.log(`✅ Created organization: ${newOrg.id}`)
    console.log(`   Name: ${newOrg.name}`)
    console.log(`   Slug: ${newOrg.slug}`)
    console.log(`   Plan: ${newOrg.plan}`)
    console.log(`   Trial Ends: ${newOrg.trialEndsAt?.toLocaleDateString()}\n`)

    // Link user to organization
    console.log('🔗 Linking user to organization...')
    
    await db
      .update(users)
      .set({
        organizationId: newOrg.id,
        role: 'owner', // Make them owner
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))

    console.log('✅ User linked to organization!\n')

    // Verify setup
    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    console.log('🎉 Setup complete!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 Final Status:')
    console.log(`   User Email: ${updatedUser.email}`)
    console.log(`   User Role: ${updatedUser.role}`)
    console.log(`   Organization ID: ${updatedUser.organizationId}`)
    console.log(`   Organization Name: ${newOrg.name}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('✨ You can now use the app without 500 errors!')
    console.log('🌐 Visit: https://synqforge.com\n')

  } catch (error) {
    console.error('❌ Error during setup:', error)
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

// Run the setup
setupUserOrganization()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })

