'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react'

interface ErrorFallbackProps {
  error?: Error | string
  resetError?: () => void
  showBackButton?: boolean
  showHomeButton?: boolean
}

export function ErrorFallback({ 
  error, 
  resetError,
  showBackButton = true,
  showHomeButton = true
}: ErrorFallbackProps) {
  const errorMessage = typeof error === 'string' 
    ? error 
    : error?.message || 'Something went wrong'

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full border-destructive/50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Oops! Something went wrong</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                {errorMessage}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
              {resetError && (
                <Button onClick={resetError} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
              {showBackButton && (
                <Button onClick={() => window.history.back()} variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
              )}
              {showHomeButton && (
                <Button onClick={() => window.location.href = '/dashboard'} variant="outline">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              )}
            </div>

            {process.env.NODE_ENV === 'development' && error instanceof Error && error.stack && (
              <details className="mt-4 w-full">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Show error details
                </summary>
                <pre className="mt-2 text-xs text-left bg-muted p-4 rounded overflow-auto max-h-40">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

