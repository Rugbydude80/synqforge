/**
 * Check which users exist in the database
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, or, like } from 'drizzle-orm'

async function checkUsers() {
  console.log('Checking for users...\n')
  
  const targetEmails = [
    'chris@synqforge.com',
    'chrisjrobertson@outlook.com'
  ]
  
  // Check exact matches
  const exactMatches = await db
    .select()
    .from(users)
    .where(
      or(
        eq(users.email, targetEmails[0]),
        eq(users.email, targetEmails[1])
      )
    )
  
  console.log('Exact email matches:')
  exactMatches.forEach(u => {
    console.log(`  - ${u.email} (ID: ${u.id})`)
  })
  
  // Check for chris@ variations
  const chrisMatches = await db
    .select()
    .from(users)
    .where(like(users.email, '%chris%@%'))
  
  console.log('\nAll users with "chris" in email:')
  chrisMatches.forEach(u => {
    console.log(`  - ${u.email} (ID: ${u.id})`)
  })
}

checkUsers()



