'use client';

// This file captures React rendering errors in the root layout
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#react-render-errors-in-app-router

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center space-y-6 p-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-foreground">
                Something went wrong!
              </h1>
              <p className="text-lg text-muted-foreground">
                We've been notified and are working on a fix.
              </p>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <div className="text-left bg-secondary p-4 rounded-lg max-w-2xl mx-auto overflow-auto">
                <p className="font-mono text-sm text-destructive">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="font-mono text-xs text-muted-foreground mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}
            
            <div className="space-x-4">
              <Button onClick={reset} variant="default">
                Try again
              </Button>
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
              >
                Go home
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

