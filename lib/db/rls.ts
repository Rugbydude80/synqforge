import { type Sql } from 'postgres'
import { type UserContext } from '@/lib/middleware/auth'

/**
 * RLS Helper - Sets user context for Row Level Security
 * This ensures database-level security by setting session variables
 * that RLS policies can use to filter data
 *
 * IMPORTANT: RLS policies are now enabled on all tables. This provides
 * defense-in-depth security beyond application-level checks.
 */

/**
 * Set RLS context for a database session
 * Sets session variables that RLS policies use for authorization
 */
export async function setRLSContext(
  client: Sql,
  userContext: UserContext
): Promise<void> {
  // Set session variables that RLS functions read
  // These are used by app.current_user_*() functions in RLS policies
  await client`
    SELECT
      set_config('app.current_user_id', ${userContext.id}, true),
      set_config('app.current_user_organization_id', ${userContext.organizationId}, true),
      set_config('app.current_user_role', ${userContext.role}, true)
  `
}

/**
 * Execute a query with RLS context
 * Wraps a query in a transaction with proper RLS context set
 */
export async function withRLS<T>(
  client: Sql,
  userContext: UserContext,
  callback: () => Promise<T>
): Promise<T> {
  return (await client.begin(async (tx) => {
    // Set RLS context for this transaction
    await tx`
      SELECT
        set_config('app.current_user_id', ${userContext.id}, true),
        set_config('app.current_user_organization_id', ${userContext.organizationId}, true),
        set_config('app.current_user_role', ${userContext.role}, true)
    `

    // Execute the callback with RLS context active
    return await callback()
  })) as T
}

/**
 * Clear RLS context (for cleanup)
 */
export async function clearRLSContext(client: Sql): Promise<void> {
  await client`
    SELECT
      set_config('app.current_user_id', NULL, true),
      set_config('app.current_user_organization_id', NULL, true),
      set_config('app.current_user_role', NULL, true)
  `
}

/**
 * Execute admin query bypassing RLS
 * DANGEROUS: Only use for system operations that require bypassing RLS
 * Must be used with extreme caution and proper authorization checks
 *
 * Use cases:
 * - Stripe webhooks that need to update subscriptions across orgs
 * - System migrations and maintenance tasks
 * - Signup flow that creates new organizations
 */
export async function withAdminBypass<T>(
  client: Sql,
  callback: () => Promise<T>
): Promise<T> {
  return (await client.begin(async (tx) => {
    // Disable RLS for this transaction
    await tx`
      SET LOCAL row_security = off
    `

    try {
      return await callback()
    } finally {
      // Re-enable RLS
      await tx`
        SET LOCAL row_security = on
      `
    }
  })) as T
}

/**
 * Check if RLS context is set (for debugging)
 */
export async function getRLSContext(client: Sql): Promise<{
  userId: string | null
  organizationId: string | null
  role: string | null
}> {
  const [result] = await client`
    SELECT
      current_setting('app.current_user_id', true) as user_id,
      current_setting('app.current_user_organization_id', true) as organization_id,
      current_setting('app.current_user_role', true) as role
  `
  return {
    userId: result?.user_id || null,
    organizationId: result?.organization_id || null,
    role: result?.role || null,
  }
}
