// This file is used to initialize Sentry on the client side
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  environment: process.env.NODE_ENV || 'development',
  
  ignoreErrors: [
    'top.GLOBALS',
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    'fb_xd_fragment',
    'bmi_SafeAddOnload',
    'EBCallBackMessageReceived',
    'NetworkError',
    'Non-Error promise rejection captured',
    'Stripe.js not available',
  ],
  
  beforeSend(event, hint) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Sentry Error (not sent in dev):', hint.originalException || hint.syntheticException);
      return null;
    }
    
    if (event.request?.data) {
      const data = event.request.data;
      if (typeof data === 'object') {
        const sanitized = { ...data };
        ['password', 'token', 'secret', 'apiKey', 'api_key'].forEach(key => {
          if (sanitized[key]) {
            sanitized[key] = '[Filtered]';
          }
        });
        event.request.data = sanitized;
      }
    }
    
    return event;
  },
});

// Hook to capture router navigation transitions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

