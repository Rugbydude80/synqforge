import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { db } from '@/lib/db'
import { users, organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { verifyPassword } from '@/lib/utils/auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      image: string | null
      role: string
      organizationId: string
      organizationName: string
    }
  }

  interface User {
    id: string
    email: string
    name: string | null
    role: string
    organizationId: string
    organizationName: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.warn('[Auth] Missing credentials')
            return null
          }

          const normalizedEmail = credentials.email.toLowerCase().trim()
          
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, normalizedEmail))
            .limit(1)

          if (!user) {
            console.warn(`[Auth] User not found: ${normalizedEmail}`)
            return null
          }

          if (!user.isActive) {
            console.warn(`[Auth] User account inactive: ${user.id}`)
            return null
          }

          if (!user.password) {
            console.warn(`[Auth] User has no password set (OAuth only): ${user.id}`)
            return null
          }

          // Verify password
          const isValidPassword = await verifyPassword(credentials.password, user.password)
          if (!isValidPassword) {
            console.warn(`[Auth] Invalid password for user: ${user.id}`)
            return null
          }

          // Fetch organization info for the user
          const [org] = await db
            .select({ name: organizations.name })
            .from(organizations)
            .where(eq(organizations.id, user.organizationId))
            .limit(1)

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || 'viewer',
            organizationId: user.organizationId,
            organizationName: org?.name || 'Unknown Organization',
          }
        } catch (error) {
          console.error('[Auth] Error in authorize callback:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      try {
        // CRITICAL FIX: Store session version in token on initial sign-in
        if (user) {
          token.id = user.id
          token.email = user.email
          token.role = user.role
          token.organizationId = user.organizationId
          token.organizationName = user.organizationName
          
          // Get current session version from database (with fallback for missing column)
          try {
            const [dbUser] = await db
              .select({ sessionVersion: users.sessionVersion, isActive: users.isActive })
              .from(users)
              .where(eq(users.id, user.id))
              .limit(1)
            
            if (dbUser) {
              token.sessionVersion = dbUser.sessionVersion || 1
              
              // Check if user is active
              if (!dbUser.isActive) {
                console.warn(`[Auth] JWT callback: User account deactivated: ${user.id}`)
                throw new Error('User account is deactivated')
              }
            } else {
              // Fallback if user not found
              token.sessionVersion = 1
            }
          } catch (dbError: any) {
            // Handle missing session_version column gracefully
            if (dbError?.message?.includes('session_version') || dbError?.code === '42703') {
              console.warn('[Auth] session_version column missing, using default value. Run migration 0012_add_session_versioning.sql')
              token.sessionVersion = 1
              
              // Still check if user is active
              const [dbUser] = await db
                .select({ isActive: users.isActive })
                .from(users)
                .where(eq(users.id, user.id))
                .limit(1)
              
              if (dbUser && !dbUser.isActive) {
                console.warn(`[Auth] JWT callback: User account deactivated: ${user.id}`)
                throw new Error('User account is deactivated')
              }
            } else {
              throw dbError
            }
          }
        } else if (token.id) {
          // CRITICAL FIX: On subsequent requests, verify session version matches
          try {
            const [dbUser] = await db
              .select({ sessionVersion: users.sessionVersion, isActive: users.isActive })
              .from(users)
              .where(eq(users.id, token.id as string))
              .limit(1)
            
            if (dbUser) {
              // If session version doesn't match, invalidate token
              const tokenSessionVersion = (token.sessionVersion as number) || 1
              const dbSessionVersion = dbUser.sessionVersion || 1
              
              if (dbSessionVersion !== tokenSessionVersion) {
                console.warn(`[Auth] JWT callback: Session version mismatch for user: ${token.id}`)
                throw new Error('Session has been invalidated. Please sign in again.')
              }
              
              // Check if user is still active
              if (!dbUser.isActive) {
                console.warn(`[Auth] JWT callback: User account deactivated: ${token.id}`)
                throw new Error('User account is deactivated')
              }
            } else {
              console.warn(`[Auth] JWT callback: User not found in database: ${token.id}`)
              throw new Error('User not found')
            }
          } catch (dbError: any) {
            // Handle missing session_version column gracefully
            if (dbError?.message?.includes('session_version') || dbError?.code === '42703') {
              console.warn('[Auth] session_version column missing, skipping version check. Run migration 0012_add_session_versioning.sql')
              
              // Still check if user exists and is active
              const [dbUser] = await db
                .select({ isActive: users.isActive })
                .from(users)
                .where(eq(users.id, token.id as string))
                .limit(1)
              
              if (!dbUser) {
                console.warn(`[Auth] JWT callback: User not found in database: ${token.id}`)
                throw new Error('User not found')
              }
              
              if (!dbUser.isActive) {
                console.warn(`[Auth] JWT callback: User account deactivated: ${token.id}`)
                throw new Error('User account is deactivated')
              }
              
              // Use default session version
              token.sessionVersion = 1
            } else {
              throw dbError
            }
          }
        }
        
        return token
      } catch (error) {
        console.error('[Auth] JWT callback error:', error)
        throw error
      }
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.role = token.role as string
        session.user.organizationId = token.organizationId as string
        session.user.organizationName = token.organizationName as string
      }
      return session
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        // Check if user exists
        const [existingUser] = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            organizationId: users.organizationId,
            isActive: users.isActive
          })
          .from(users)
          .where(eq(users.email, user.email!))
          .limit(1)

        if (!existingUser) {
          return false // User creation handled in signup API
        }

        if (!existingUser.isActive) {
          return false
        }

        // Fetch organization info for the user
        const [org] = await db
          .select({ name: organizations.name })
          .from(organizations)
          .where(eq(organizations.id, existingUser.organizationId))
          .limit(1)

        // Add organization info to user object for JWT callback
        user.role = existingUser.role || 'viewer'
        user.organizationId = existingUser.organizationId
        user.organizationName = org?.name || 'Unknown Organization'
      }
      return true
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Disable default error/404 pages that cause build issues in Next.js 15
  theme: {
    colorScheme: 'auto',
  },
}
