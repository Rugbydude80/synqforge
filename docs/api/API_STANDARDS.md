# API Standards and Conventions

This document outlines the standardized patterns and conventions used across all API routes in SynqForge.

## Table of Contents

1. [Response Formats](#response-formats)
2. [Error Handling](#error-handling)
3. [Parameter Extraction](#parameter-extraction)
4. [HTTP Methods](#http-methods)
5. [Authentication](#authentication)

## Response Formats

### Web API Routes (`/api/*`)

Web API routes use the following response formats:

**Single Resource:**
```json
{
  "data": { ... }
}
```

**List Resources:**
```json
{
  "data": [ ... ],
  "total": 100,
  "limit": 20,
  "offset": 0,
  "hasMore": true
}
```

**Success Response (with helpers):**
```typescript
import { successResponse, listResponse } from '@/lib/utils/api-helpers'

// Single resource
return successResponse(project)

// List with pagination
return listResponse(projects, total, { limit, offset, hasMore })
```

### REST API v1 Routes (`/api/v1/*`)

REST API v1 routes use a consistent format with metadata:

**Single Resource:**
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "total": 1,
    "hasMore": false
  }
}
```

**List Resources:**
```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "total": 100,
    "hasMore": true
  }
}
```

**Success Response (with helpers):**
```typescript
import { v1Response, v1ListResponse } from '@/lib/utils/api-helpers'

// Single resource
return v1Response(project, { page: 1, total: 1, hasMore: false })

// List with pagination
return v1ListResponse(projects, { page: 1, total: 100, hasMore: true })
```

## Error Handling

All routes must use `formatErrorResponse()` from `@/lib/errors/custom-errors` for consistent error formatting.

### Standard Error Response Format

```json
{
  "error": "ErrorClassName",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "statusCode": 400,
  "details": { ... }
}
```

### Implementation Pattern

```typescript
import { formatErrorResponse, isApplicationError } from '@/lib/errors/custom-errors'

try {
  // ... route logic
} catch (error) {
  console.error('Route error:', error)
  
  if (isApplicationError(error)) {
    const response = formatErrorResponse(error)
    const { statusCode, ...errorBody } = response
    return NextResponse.json(errorBody, { status: statusCode })
  }
  
  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    const response = formatErrorResponse(error)
    const { statusCode, ...errorBody } = response
    return NextResponse.json(errorBody, { status: statusCode })
  }
  
  // Unknown errors
  const response = formatErrorResponse(error)
  const { statusCode, ...errorBody } = response
  return NextResponse.json(errorBody, { status: statusCode })
}
```

### Custom Error Classes

Use appropriate error classes from `@/lib/errors/custom-errors`:

- `ValidationError` - Invalid input (400)
- `AuthenticationError` - Auth required (401)
- `AuthorizationError` - Insufficient permissions (403)
- `NotFoundError` - Resource not found (404)
- `ConflictError` - Resource conflict (409)
- `RateLimitError` - Rate limit exceeded (429)
- `QuotaExceededError` - Subscription quota exceeded (402)
- `DatabaseError` - Database operation failed (500)

## Parameter Extraction

**Always use `context.params` instead of parsing the URL path.**

### Correct Pattern

```typescript
async function handler(req: NextRequest, context: { user: any; params: { resourceId: string } }) {
  const { resourceId } = context.params
  // ... use resourceId
}
```

### Incorrect Pattern (DO NOT USE)

```typescript
// ❌ DON'T DO THIS
const resourceId = req.nextUrl.pathname.split('/')[3]
```

### Why?

1. **Next.js 15 Compatibility**: Next.js 15 uses async params, and `context.params` handles this correctly
2. **Type Safety**: TypeScript can infer parameter types from route structure
3. **Maintainability**: Route changes don't break parameter extraction
4. **Consistency**: All routes use the same pattern

## HTTP Methods

### Standard CRUD Operations

- `GET` - Retrieve resource(s)
- `POST` - Create new resource
- `PATCH` - Update resource (partial update)
- `DELETE` - Delete resource

### Important Notes

1. **Use PATCH, not PUT**: All update operations use `PATCH` for partial updates
2. **No PUT handlers**: PUT handlers have been removed in favor of PATCH
3. **Consistent naming**: Handler functions should match HTTP method (e.g., `updateProject` for PATCH)

### Example

```typescript
export const GET = withAuth(getProject)
export const POST = withAuth(createProject)
export const PATCH = withAuth(updateProject)  // ✅ Use PATCH
export const DELETE = withAuth(deleteProject)
```

## Authentication

### Web API Routes (`/api/*`)

Use `withAuth` middleware from `@/lib/middleware/auth`:

```typescript
import { withAuth } from '@/lib/middleware/auth'

export const GET = withAuth(handler, {
  requireOrg: true,
  requireProject: true,
  allowedRoles: ['admin', 'member', 'viewer']
})
```

### REST API v1 Routes (`/api/v1/*`)

Use `withApiAuth` middleware from `@/lib/middleware/api-auth`:

```typescript
import { withApiAuth } from '@/lib/middleware/api-auth'

export const GET = withApiAuth(handler, {
  requireWrite: false,
  allowedRoles: ['admin', 'member']
})
```

### Public Routes

Public routes are defined in `middleware.ts`:

```typescript
const publicApiRoutes = [
  '/api/auth',
  '/api/webhooks/stripe',
  '/api/docs',
]
```

Routes matching these patterns bypass authentication middleware.

## Helper Functions

### Available Helpers

Located in `lib/utils/api-helpers.ts`:

- `successResponse<T>(data: T, meta?: any)` - Web API success response
- `listResponse<T>(data: T[], total: number, options?)` - Web API list response
- `v1Response<T>(data: T, meta?)` - REST API v1 success response
- `v1ListResponse<T>(data: T[], meta)` - REST API v1 list response
- `errorResponse(error: unknown, defaultStatus?)` - Standardized error response

### Usage Examples

```typescript
import { successResponse, listResponse, errorResponse } from '@/lib/utils/api-helpers'

// Success
return successResponse(project)

// List
return listResponse(projects, total, { limit, offset, hasMore })

// Error
return errorResponse(error)
```

## Best Practices

1. **Always use type-safe parameter extraction**: `const { id } = context.params`
2. **Use formatErrorResponse for all errors**: Ensures consistent error format
3. **Use helper functions for responses**: Maintains consistency
4. **Log errors before returning**: Helps with debugging
5. **Use appropriate HTTP status codes**: 200 (success), 201 (created), 400 (bad request), 404 (not found), etc.
6. **Validate input with Zod**: Use validation schemas before processing
7. **Check permissions**: Use `allowedRoles` and `requireProject` options
8. **Handle edge cases**: Check for null/undefined values before use

## Migration Checklist

When updating existing routes:

- [ ] Replace `pathname.split()` with `context.params`
- [ ] Replace custom error handlers with `formatErrorResponse()`
- [ ] Replace PUT handlers with PATCH
- [ ] Use standardized response helpers
- [ ] Ensure consistent error handling pattern
- [ ] Verify authentication middleware is present
- [ ] Update route documentation/comments

## Examples

### Complete Route Example

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { formatErrorResponse, isApplicationError } from '@/lib/errors/custom-errors'
import { ValidationError, NotFoundError } from '@/lib/errors/custom-errors'
import { successResponse } from '@/lib/utils/api-helpers'
import { z } from 'zod'

const UpdateSchema = z.object({
  name: z.string().min(1),
})

async function updateResource(
  req: NextRequest,
  context: { user: any; params: { resourceId: string } }
) {
  try {
    const { resourceId } = context.params
    const body = await req.json()
    
    const validation = UpdateSchema.safeParse(body)
    if (!validation.success) {
      throw new ValidationError('Invalid input', { issues: validation.error.issues })
    }
    
    // ... update logic
    
    return successResponse(updatedResource)
  } catch (error) {
    console.error('Update error:', error)
    
    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }
    
    const response = formatErrorResponse(error)
    const { statusCode, ...errorBody } = response
    return NextResponse.json(errorBody, { status: statusCode })
  }
}

export const PATCH = withAuth(updateResource, {
  allowedRoles: ['admin', 'member']
})
```

