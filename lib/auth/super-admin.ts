/**
 * Super Admin Configuration
 * 
 * Special accounts with unlimited access to all features, bypassing all subscription limits.
 * These accounts are typically used by founders/developers for testing and administration.
 */

/**
 * List of email addresses that have super admin privileges
 * These users bypass ALL subscription limits and entitlements
 */
const SUPER_ADMIN_EMAILS = [
  'chrisjrobertson@outlook.com',
  'chris@synqforge.com',
] as const

/**
 * Check if a user is a super admin based on their email
 * 
 * @param email - User's email address
 * @returns true if user has super admin privileges
 */
export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  
  const normalizedEmail = email.toLowerCase().trim()
  return SUPER_ADMIN_EMAILS.some(
    adminEmail => adminEmail.toLowerCase() === normalizedEmail
  )
}

/**
 * Check if a user ID belongs to a super admin
 * This requires a database lookup but is cached in the auth context
 * 
 * @param userContext - User context with email
 * @returns true if user has super admin privileges
 */
export function isSuperAdminByContext(userContext: { email?: string | null }): boolean {
  return isSuperAdmin(userContext.email)
}

/**
 * Get super admin status message for logging
 */
export function getSuperAdminStatus(email: string | null | undefined): string {
  return isSuperAdmin(email) 
    ? '🔓 Super Admin - All limits bypassed' 
    : ''
}

