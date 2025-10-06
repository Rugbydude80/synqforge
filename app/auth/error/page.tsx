'use client'
export const dynamic = 'force-dynamic'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Home, LogIn } from 'lucide-react'

const errorMessages: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The verification token has expired or has already been used.',
  Default: 'An error occurred during authentication.',
  CredentialsSignin: 'Invalid email or password.',
  EmailSignin: 'Unable to send email.',
  OAuthSignin: 'Error occurred during OAuth sign in.',
  OAuthCallback: 'Error occurred during OAuth callback.',
  OAuthCreateAccount: 'Could not create OAuth account.',
  EmailCreateAccount: 'Could not create account with email.',
  Callback: 'Error occurred during callback.',
  OAuthAccountNotLinked: 'To confirm your identity, sign in with the same account you used originally.',
  SessionRequired: 'Please sign in to access this page.',
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'Default'

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md glass">
        <CardHeader className="text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-2xl">Authentication Error</CardTitle>
            <CardDescription>
              {errorMessages[error] || errorMessages.Default}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/auth/signin">
                <LogIn className="h-4 w-4 mr-2" />
                Try Again
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Link>
            </Button>
          </div>

          {error === 'OAuthAccountNotLinked' && (
            <div className="text-sm text-muted-foreground text-center p-3 bg-muted rounded-lg">
              <p>If you continue to have issues, try signing in with a different method or contact support.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
