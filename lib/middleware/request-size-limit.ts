/**
 * Request Size Limit Middleware
 * Enforces maximum request body size (10MB)
 */

import { NextRequest, NextResponse } from 'next/server'

const MAX_REQUEST_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * Check request size and return error if exceeded
 */
export async function checkRequestSize(req: NextRequest): Promise<NextResponse | null> {
  const contentLength = req.headers.get('content-length')

  if (contentLength) {
    const size = parseInt(contentLength, 10)
    if (size > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        {
          error: 'Payload Too Large',
          message: `Request body exceeds maximum size of ${MAX_REQUEST_SIZE / 1024 / 1024}MB`,
          statusCode: 413,
        },
        { status: 413 }
      )
    }
  }

  return null
}

/**
 * Middleware wrapper to enforce request size limits
 */
export function withRequestSizeLimit<T = any>(
  handler: (req: NextRequest, context: T) => Promise<Response>
): (req: NextRequest, context: T) => Promise<Response> {
  return async (req: NextRequest, context: T) => {
    // Check request size
    const sizeError = await checkRequestSize(req)
    if (sizeError) {
      return sizeError
    }

    return handler(req, context)
  }
}

