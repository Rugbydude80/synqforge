// This file is used to initialize Sentry on the server side
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side initialization
    const Sentry = await import('@sentry/nextjs');
    
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
      debug: false,
      environment: process.env.NODE_ENV || 'development',
      
      ignoreErrors: [
        'ETIMEDOUT',
        'ECONNRESET',
        'ENOTFOUND',
        'ECONNREFUSED',
        'Connection terminated unexpectedly',
        'Connection timeout',
      ],
      
      beforeSend(event, hint) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Sentry Error (not sent in dev):', hint.originalException || hint.syntheticException);
          return null;
        }
        
        // Remove sensitive data
        if (event.request) {
          if (event.request.cookies) {
            event.request.cookies = '[Filtered]';
          }
          if (event.request.headers) {
            const headers = event.request.headers;
            if (headers.authorization) {
              headers.authorization = '[Filtered]';
            }
            if (headers.cookie) {
              headers.cookie = '[Filtered]';
            }
          }
          if (event.request.data) {
            const data = event.request.data;
            if (typeof data === 'object') {
              const sanitized = { ...data };
              ['password', 'token', 'secret', 'apiKey', 'api_key', 'creditCard', 'ssn'].forEach(key => {
                if (sanitized[key]) {
                  sanitized[key] = '[Filtered]';
                }
              });
              event.request.data = sanitized;
            }
          }
        }
        
        return event;
      },
      
      tracesSampler: (samplingContext) => {
        if (samplingContext.request?.url?.includes('/api/health')) {
          return 0;
        }
        if (samplingContext.request?.method === 'POST' || samplingContext.request?.method === 'PATCH') {
          return 1.0;
        }
        return 0.1;
      },
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime initialization
    const Sentry = await import('@sentry/nextjs');
    
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
      debug: false,
      environment: process.env.NODE_ENV || 'development',
      
      beforeSend(event, hint) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Sentry Error (not sent in dev):', hint.originalException || hint.syntheticException);
          return null;
        }
        
        if (event.request?.headers) {
          const headers = event.request.headers;
          if (headers.authorization) {
            headers.authorization = '[Filtered]';
          }
          if (headers.cookie) {
            headers.cookie = '[Filtered]';
          }
        }
        
        return event;
      },
    });
  }
}

// Hook to capture errors from nested React Server Components
export const onRequestError = Sentry.captureRequestError;

