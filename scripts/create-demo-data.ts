/**
 * Create demo client, project, time entries, and invoice
 * Run with: npx tsx scripts/create-demo-data.ts
 */

import { db, generateId } from '@/lib/db'
import { users, clients, projects, stories, timeEntries, invoices } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const USER_EMAIL = 'chrisjrobertson@outlook.com'

async function createDemoData() {
  try {
    console.log('🚀 Creating demo data...\n')

    // Get user
    console.log(`📧 Finding user: ${USER_EMAIL}`)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, USER_EMAIL))
      .limit(1)

    if (!user || !user.organizationId) {
      console.error('❌ User not found or no organization!')
      process.exit(1)
    }

    console.log(`✅ Found user: ${user.name}`)
    console.log(`   Organization ID: ${user.organizationId}\n`)

    const orgId = user.organizationId
    const userId = user.id

    // 1. Create Demo Client
    console.log('👤 Creating demo client...')
    const clientId = generateId()
    const [client] = await db
      .insert(clients)
      .values({
        id: clientId,
        organizationId: orgId,
        name: 'Acme Corporation',
        logoUrl: 'https://via.placeholder.com/150?text=ACME',
        primaryContactName: 'John Smith',
        primaryContactEmail: 'john.smith@acme.corp',
        contractStartDate: '2025-01-01',
        contractEndDate: '2025-12-31',
        defaultBillingRate: '150.00',
        currency: 'USD',
        status: 'active',
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    console.log(`✅ Created client: ${client.name} (${client.id})\n`)

    // 2. Create Demo Project
    console.log('📁 Creating demo project...')
    const projectId = generateId()
    const [project] = await db
      .insert(projects)
      .values({
        id: projectId,
        organizationId: orgId,
        clientId: clientId,
        name: 'Website Redesign',
        key: 'ACME-WEB',
        slug: 'website-redesign',
        description: 'Complete redesign of Acme Corporation website with modern UI/UX',
        status: 'active',
        ownerId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    console.log(`✅ Created project: ${project.name} (${project.key})\n`)

    // 3. Create Demo Stories
    console.log('📝 Creating demo stories...')
    const storyId1 = generateId()
    const storyId2 = generateId()

    await db.insert(stories).values([
      {
        id: storyId1,
        organizationId: orgId,
        projectId: projectId,
        title: 'Design new homepage layout',
        description: 'Create modern, responsive homepage design with hero section and feature cards',
        status: 'done',
        priority: 'high',
        storyType: 'feature',
        storyPoints: 8,
        assigneeId: userId,
        aiGenerated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: storyId2,
        organizationId: orgId,
        projectId: projectId,
        title: 'Implement contact form',
        description: 'Build and integrate contact form with email notifications',
        status: 'done',
        priority: 'medium',
        storyType: 'feature',
        storyPoints: 5,
        assigneeId: userId,
        aiGenerated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    console.log(`✅ Created 2 demo stories\n`)

    // 4. Create Demo Time Entries
    console.log('⏱️  Creating demo time entries...')
    const timeEntry1Id = generateId()
    const timeEntry2Id = generateId()
    const timeEntry3Id = generateId()

    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)

    const entries = await db.insert(timeEntries).values([
      {
        id: timeEntry1Id,
        organizationId: orgId,
        userId: userId,
        storyId: storyId1,
        projectId: projectId,
        clientId: clientId,
        startedAt: threeDaysAgo,
        endedAt: new Date(threeDaysAgo.getTime() + 4 * 60 * 60 * 1000), // 4 hours
        durationMinutes: 240,
        description: 'Homepage design work',
        billingRate: '150.00',
        billableAmount: '600.00',
        isBillable: true,
        isBilled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: timeEntry2Id,
        organizationId: orgId,
        userId: userId,
        storyId: storyId1,
        projectId: projectId,
        clientId: clientId,
        startedAt: twoDaysAgo,
        endedAt: new Date(twoDaysAgo.getTime() + 3 * 60 * 60 * 1000), // 3 hours
        durationMinutes: 180,
        description: 'Homepage responsive adjustments',
        billingRate: '150.00',
        billableAmount: '450.00',
        isBillable: true,
        isBilled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: timeEntry3Id,
        organizationId: orgId,
        userId: userId,
        storyId: storyId2,
        projectId: projectId,
        clientId: clientId,
        startedAt: oneDayAgo,
        endedAt: new Date(oneDayAgo.getTime() + 5 * 60 * 60 * 1000), // 5 hours
        durationMinutes: 300,
        description: 'Contact form implementation',
        billingRate: '150.00',
        billableAmount: '750.00',
        isBillable: true,
        isBilled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]).returning()

    console.log(`✅ Created 3 time entries (12 hours total)\n`)

    // 5. Create Demo Invoice
    console.log('🧾 Creating demo invoice...')
    const invoiceId = generateId()
    
    const [invoice] = await db
      .insert(invoices)
      .values({
        id: invoiceId,
        organizationId: orgId,
        clientId: clientId,
        invoiceNumber: 'INV-2025-001',
        status: 'draft',
        issueDate: now.toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
        totalHours: '12.00',
        totalAmount: '1800.00',
        currency: 'USD',
        lineItems: [
          {
            description: 'Design new homepage layout',
            hours: 7,
            rate: 150,
            amount: 1050,
            storyId: storyId1,
          },
          {
            description: 'Implement contact form',
            hours: 5,
            rate: 150,
            amount: 750,
            storyId: storyId2,
          },
        ],
        notes: 'Thank you for your business! Payment terms: Net 30 days.',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    console.log(`✅ Created invoice: ${invoice.invoiceNumber} - $${invoice.totalAmount}\n`)

    // Mark time entries as billed
    await db
      .update(timeEntries)
      .set({
        isBilled: true,
        invoiceId: invoiceId,
        updatedAt: new Date(),
      })
      .where(eq(timeEntries.id, timeEntry1Id))

    await db
      .update(timeEntries)
      .set({
        isBilled: true,
        invoiceId: invoiceId,
        updatedAt: new Date(),
      })
      .where(eq(timeEntries.id, timeEntry2Id))

    await db
      .update(timeEntries)
      .set({
        isBilled: true,
        invoiceId: invoiceId,
        updatedAt: new Date(),
      })
      .where(eq(timeEntries.id, timeEntry3Id))

    console.log(`✅ Marked time entries as billed\n`)

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 Demo Data Created Successfully!\n')
    console.log('📊 Summary:')
    console.log(`   👤 Client: ${client.name}`)
    console.log(`      Contact: ${client.primaryContactEmail}`)
    console.log(`      Billing Rate: $${client.defaultBillingRate}/hr`)
    console.log('')
    console.log(`   📁 Project: ${project.name} (${project.key})`)
    console.log(`      Status: ${project.status}`)
    console.log('')
    console.log(`   📝 Stories: 2 completed`)
    console.log(`      - Design new homepage layout (8 pts)`)
    console.log(`      - Implement contact form (5 pts)`)
    console.log('')
    console.log(`   ⏱️  Time Entries: 3 entries`)
    console.log(`      Total Hours: 12 hours`)
    console.log(`      Total Amount: $1,800.00`)
    console.log('')
    console.log(`   🧾 Invoice: ${invoice.invoiceNumber}`)
    console.log(`      Status: ${invoice.status}`)
    console.log(`      Amount: $${invoice.totalAmount}`)
    console.log(`      Due Date: ${invoice.dueDate}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('✨ You can now see this data at:')
    console.log('   🌐 Clients: https://synqforge.com/clients')
    console.log('   📁 Projects: https://synqforge.com/projects')
    console.log('   🧾 Invoices: https://synqforge.com/invoices')
    console.log('')

  } catch (error) {
    console.error('❌ Error creating demo data:', error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

createDemoData()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })



