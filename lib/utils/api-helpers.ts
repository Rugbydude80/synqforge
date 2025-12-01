import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AppError, ValidationError, APIResponse } from '@/lib/types'
import { formatErrorResponse, isApplicationError } from '@/lib/errors/custom-errors'

/**
 * Create a standardized success response for web API routes (/api/*)
 * Returns: { data: T } or { data: T[], total: number }
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
 * Create a standardized list response for web API routes (/api/*)
 * Returns: { data: T[], total: number, limit?: number, offset?: number, hasMore?: boolean }
 */
export function listResponse<T>(
  data: T[],
  total: number,
  options?: {
    limit?: number
    offset?: number
    hasMore?: boolean
  }
): Response {
  return NextResponse.json({
    data,
    total,
    ...(options?.limit !== undefined && { limit: options.limit }),
    ...(options?.offset !== undefined && { offset: options.offset }),
    ...(options?.hasMore !== undefined && { hasMore: options.hasMore }),
  })
}

/**
 * Create a standardized response for REST API v1 routes (/api/v1/*)
 * Returns: { data: T, meta?: { page, total, hasMore } }
 */
export function v1Response<T>(
  data: T,
  meta?: {
    page?: number
    total?: number
    hasMore?: boolean
  }
): Response {
  const response: any = { data }
  if (meta) {
    response.meta = meta
  }
  return NextResponse.json(response)
}

/**
 * Create a standardized list response for REST API v1 routes (/api/v1/*)
 * Returns: { data: T[], meta: { page, total, hasMore } }
 */
export function v1ListResponse<T>(
  data: T[],
  meta: {
    page: number
    total: number
    hasMore: boolean
  }
): Response {
  return NextResponse.json({
    data,
    meta,
  })
}

/**
 * Create a standardized error response
 * Uses formatErrorResponse from custom-errors.ts for consistency
 */
export function errorResponse(error: unknown, defaultStatus = 500): Response {
  // Use formatErrorResponse for consistent error formatting
  if (isApplicationError(error)) {
    const formatted = formatErrorResponse(error)
    const { statusCode, ...errorBody } = formatted
    return NextResponse.json(errorBody, { status: statusCode })
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: error.errors.map((e) => ({
          path: e.path,
          message: e.message,
        })),
      },
      { status: 400 }
    )
  }

  // Handle unknown errors
  console.error('Unhandled error:', error)
  const formatted = formatErrorResponse(error)
  const { statusCode, ...errorBody } = formatted
  return NextResponse.json(errorBody, { status: statusCode || defaultStatus })
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
