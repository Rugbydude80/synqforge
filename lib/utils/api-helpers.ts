import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AppError, ValidationError, APIResponse } from '@/lib/types'

/**
 * Create a standardized success response
 */
export function successResponse<T>(data: T, meta?: any): Response {
  const response: APIResponse<T> = {
    success: true,
    data,
    ...(meta && { meta }),
  }
  return NextResponse.json(response)
}

/**
 * Create a standardized error response
 */
export function errorResponse(error: unknown, defaultStatus = 500): Response {
  // Handle known AppError instances
  if (error instanceof AppError) {
    const response: APIResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      },
    }
    return NextResponse.json(response, { status: error.statusCode })
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const response: APIResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors.map((e) => ({
          path: e.path,
          message: e.message,
        })),
      },
    }
    return NextResponse.json(response, { status: 400 })
  }

  // Handle unknown errors
  console.error('Unhandled error:', error)
  const response: APIResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  }
  return NextResponse.json(response, { status: defaultStatus })
}

/**
 * Parse and validate request body with Zod schema
 */
export async function parseRequestBody<T>(request: Request, schema: any): Promise<T> {
  try {
    const body = await request.json()
    return schema.parse(body) as T
  } catch (error) {
    if (error instanceof ZodError) {
      throw error
    }
    throw new ValidationError('Invalid JSON in request body')
  }
}

/**
 * Extract query parameters from URL
 */
export function getQueryParams(url: URL): Record<string, string> {
  const params: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    params[key] = value
  })
  return params
}
