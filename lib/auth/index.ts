import { getServerSession } from 'next-auth'
import { authOptions } from './options'

/**
 * Get the current session on the server side
 * This is a wrapper around NextAuth's getServerSession
 */
export async function auth() {
  return await getServerSession(authOptions)
}

export { authOptions } from './options'
