# 📝 JSDoc Standards & Templates

**Purpose:** Comprehensive guide for documenting TypeScript/JavaScript functions in this codebase

---

## ✅ JSDoc Standards

### 1. **All Exported Functions Must Have JSDoc**
- Public APIs
- Service methods
- Repository methods
- Utility functions
- Middleware handlers

### 2. **Required Elements**
- Brief description (one line)
- Detailed description (2-3 sentences)
- All `@param` tags with types and descriptions
- `@returns` tag with type and description
- `@throws` for any errors
- `@example` for complex functions

### 3. **Optional But Recommended**
- `@see` for related functions
- `@deprecated` for old APIs
- `@since` for version tracking
- `@internal` for internal-only functions

---

## 📋 Templates

### Basic Function Template

```typescript
/**
 * Brief one-line description of what this function does
 * 
 * More detailed explanation of:
 * - What problem this solves
 * - Important behaviors or side effects
 * - Any assumptions or prerequisites
 * 
 * @param {ParamType} paramName - Description of the parameter
 * @param {ParamType} [optionalParam] - Description (optional parameter)
 * @returns {ReturnType} Description of what is returned
 * @throws {ErrorType} When and why this error is thrown
 * 
 * @example
 * ```typescript
 * const result = await functionName('example');
 * console.log(result); // Expected output
 * ```
 */
export async function functionName(
  paramName: ParamType,
  optionalParam?: ParamType
): Promise<ReturnType> {
  // Implementation
}
```

### Complex Function Template (with multiple return properties)

```typescript
/**
 * Brief description
 * 
 * Detailed explanation including:
 * - Business logic context
 * - Side effects (database writes, API calls, etc.)
 * - Performance considerations
 * - Security implications
 * 
 * @param {Object} options - Configuration object
 * @param {string} options.userId - The user ID
 * @param {string} options.organizationId - The organization ID
 * @param {string} [options.filter] - Optional filter criteria
 * 
 * @returns {Promise<Result>} The operation result
 * @returns {boolean} .success - Whether operation succeeded
 * @returns {Data} .data - The returned data
 * @returns {string} [.error] - Error message if failed
 * @returns {number} [.count] - Number of items processed
 * 
 * @throws {ValidationError} If input validation fails
 * @throws {AuthorizationError} If user lacks permissions
 * @throws {DatabaseError} If database query fails
 * 
 * @see {@link relatedFunction} for related functionality
 * 
 * @example
 * ```typescript
 * const result = await complexFunction({
 *   userId: 'user_123',
 *   organizationId: 'org_456',
 *   filter: 'active'
 * });
 * 
 * if (result.success) {
 *   console.log(`Processed ${result.count} items`);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
```

### Repository Method Template

```typescript
/**
 * Retrieves entities from the database with optional filtering and pagination
 * 
 * This method performs a database query with:
 * - Automatic filtering based on user permissions
 * - Pagination support (limit/offset)
 * - Soft-delete filtering (excludes deleted records)
 * - Optimized joins for related entities
 * 
 * @param {Object} filters - Filter criteria
 * @param {string} [filters.userId] - Filter by user ID
 * @param {string} [filters.status] - Filter by status
 * @param {Date} [filters.createdAfter] - Filter by creation date
 * 
 * @param {Object} options - Query options
 * @param {number} [options.limit=100] - Max records to return (default: 100)
 * @param {number} [options.offset=0] - Records to skip (default: 0)
 * @param {string} [options.orderBy='createdAt'] - Sort field (default: 'createdAt')
 * @param {'asc'|'desc'} [options.orderDirection='desc'] - Sort direction
 * 
 * @returns {Promise<QueryResult>} Query results
 * @returns {Entity[]} .data - Array of entities
 * @returns {number} .total - Total count (for pagination)
 * @returns {number} .limit - Applied limit
 * @returns {number} .offset - Applied offset
 * 
 * @throws {DatabaseError} If query execution fails
 * @throws {ValidationError} If filter parameters are invalid
 * 
 * @example
 * ```typescript
 * const result = await repository.list(
 *   { status: 'active', userId: 'user_123' },
 *   { limit: 50, offset: 0, orderBy: 'name' }
 * );
 * 
 * console.log(`Found ${result.total} total records`);
 * console.log(`Showing ${result.data.length} records`);
 * ```
 */
```

### Service Function Template

```typescript
/**
 * Performs a business operation with validation and side effects
 * 
 * This service function:
 * 1. Validates input data
 * 2. Checks user permissions
 * 3. Performs the core business logic
 * 4. Updates related entities
 * 5. Sends notifications
 * 6. Logs the operation for audit
 * 
 * **Side Effects:**
 * - Updates database records
 * - Sends email notifications
 * - Triggers webhooks
 * - Records audit log entries
 * 
 * **Performance:**
 * - Typical execution time: 100-500ms
 * - May be slower for large datasets (>1000 items)
 * 
 * **Security:**
 * - Requires authenticated user
 * - Enforces row-level security
 * - Rate-limited to 100 calls/minute per user
 * 
 * @param {string} userId - The authenticated user ID
 * @param {InputData} data - The operation input data
 * @param {string} data.field1 - Description of field1
 * @param {number} data.field2 - Description of field2
 * @param {Object} [options] - Optional configuration
 * @param {boolean} [options.skipNotifications=false] - Skip sending notifications
 * @param {boolean} [options.dryRun=false] - Validate without executing
 * 
 * @returns {Promise<OperationResult>} The operation result
 * @returns {boolean} .success - Whether operation succeeded
 * @returns {Entity} .entity - The created/updated entity
 * @returns {string} .operationId - Unique ID for tracking
 * @returns {Notification[]} [.notifications] - Notifications sent
 * 
 * @throws {ValidationError} If input data is invalid
 * @throws {AuthorizationError} If user lacks required permissions
 * @throws {RateLimitError} If rate limit exceeded
 * @throws {BusinessLogicError} If business rules violated
 * 
 * @see {@link relatedService} for related operations
 * @see {@link validator} for validation rules
 * 
 * @example
 * ```typescript
 * try {
 *   const result = await serviceFunction('user_123', {
 *     field1: 'value',
 *     field2: 42
 *   }, {
 *     skipNotifications: false
 *   });
 *   
 *   if (result.success) {
 *     console.log(`Operation ${result.operationId} completed`);
 *     console.log(`Sent ${result.notifications?.length || 0} notifications`);
 *   }
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.error('Invalid input:', error.message);
 *   } else if (error instanceof RateLimitError) {
 *     console.error('Rate limit exceeded, retry later');
 *   } else {
 *     console.error('Operation failed:', error);
 *   }
 * }
 * ```
 */
```

### API Route Handler Template

```typescript
/**
 * API Route: GET /api/resource
 * 
 * Retrieves resources with filtering, sorting, and pagination
 * 
 * **Authentication:** Required (JWT token in Authorization header)
 * **Authorization:** User must have 'read:resource' permission
 * **Rate Limit:** 100 requests/minute per user
 * 
 * **Query Parameters:**
 * - `status` (string, optional): Filter by status ('active', 'inactive', 'deleted')
 * - `search` (string, optional): Search query for text fields
 * - `limit` (number, optional): Max results (default: 50, max: 1000)
 * - `offset` (number, optional): Pagination offset (default: 0)
 * - `orderBy` (string, optional): Sort field (default: 'createdAt')
 * - `orderDirection` ('asc'|'desc', optional): Sort direction (default: 'desc')
 * 
 * **Response (200 OK):**
 * ```json
 * {
 *   "data": [...],
 *   "pagination": {
 *     "total": 150,
 *     "limit": 50,
 *     "offset": 0,
 *     "hasMore": true
 *   }
 * }
 * ```
 * 
 * **Error Responses:**
 * - `401 Unauthorized`: Missing or invalid authentication token
 * - `403 Forbidden`: User lacks required permissions
 * - `429 Too Many Requests`: Rate limit exceeded
 * - `500 Internal Server Error`: Server error occurred
 * 
 * @param {NextRequest} request - The incoming request object
 * @returns {Promise<NextResponse>} JSON response with resource data
 * 
 * @example
 * ```typescript
 * // Client-side usage
 * const response = await fetch('/api/resource?status=active&limit=20', {
 *   headers: {
 *     'Authorization': `Bearer ${token}`
 *   }
 * });
 * 
 * if (response.ok) {
 *   const { data, pagination } = await response.json();
 *   console.log(`Showing ${data.length} of ${pagination.total} resources`);
 * }
 * ```
 */
```

---

## 🎯 TOP 10 CRITICAL FUNCTIONS (Documented)

### ✅ 1. `checkStoryUpdateEntitlement` - lib/entitlements/checkStoryUpdate.ts
**Status:** ✅ DOCUMENTED (comprehensive JSDoc added)
**Purpose:** Validates story update permissions based on tier

### 2. `createStory` - lib/repositories/stories.repository.ts
**Status:** Needs documentation
**Purpose:** Creates a new story with validation

### 3. `generateStories` - lib/services/ai.service.ts
**Status:** Needs documentation
**Purpose:** AI-powered story generation

### 4. `splitStory` - lib/services/story-split.service.ts
**Status:** Needs documentation
**Purpose:** Splits a story into child stories

### 5. `calculateVelocity` - lib/services/velocity.service.ts
**Status:** Needs documentation
**Purpose:** Calculates team velocity metrics

### 6. `processStripeWebhook` - app/api/webhooks/stripe/route.ts
**Status:** Needs documentation
**Purpose:** Handles Stripe payment webhooks

### 7. `withAuth` - lib/middleware/auth.ts
**Status:** Needs documentation
**Purpose:** Authentication middleware wrapper

### 8. `consumeTokens` - lib/services/tokenService.ts
**Status:** Needs documentation
**Purpose:** Consumes AI tokens from pool

### 9. `createTask` - lib/repositories/tasks.repository.ts
**Status:** Needs documentation
**Purpose:** Creates a task for a story

### 10. `purchaseAddOn` - lib/services/addOnService.ts
**Status:** Needs documentation
**Purpose:** Processes add-on purchases

---

## 📊 Documentation Coverage

**Current Coverage:** ~15% of exported functions
**Target Coverage:** 80% of exported functions
**Critical Functions Documented:** 1/10 (10%)

---

## 🚀 Next Steps

### Immediate (This Session)
1. ✅ Document `checkStoryUpdateEntitlement`
2. Document remaining TOP 10 functions
3. Create JSDoc linter rules

### Short Term (Next Sprint)
4. Document all service functions (20+ files)
5. Document all repository methods (10+ files)
6. Add examples to complex functions

### Long Term (Future Sprints)
7. Document utility functions
8. Document middleware
9. Document API routes
10. Set up automated JSDoc generation

---

## ⚙️ Automation

### ESLint Rule for JSDoc

Add to `.eslintrc.js`:

```javascript
{
  "rules": {
    "jsdoc/require-jsdoc": ["warn", {
      "publicOnly": true,
      "require": {
        "FunctionDeclaration": true,
        "MethodDefinition": true,
        "ClassDeclaration": true,
        "ArrowFunctionExpression": false,
        "FunctionExpression": false
      }
    }],
    "jsdoc/require-param": "warn",
    "jsdoc/require-returns": "warn",
    "jsdoc/require-param-description": "warn",
    "jsdoc/require-returns-description": "warn"
  },
  "plugins": ["jsdoc"]
}
```

### TypeDoc Configuration

Create `typedoc.json`:

```json
{
  "entryPoints": ["lib/**/*.ts", "components/**/*.tsx"],
  "out": "docs/api",
  "excludePrivate": true,
  "excludeProtected": true,
  "excludeExternals": true,
  "readme": "README.md",
  "name": "SynqForge API Documentation",
  "includeVersion": true
}
```

Generate docs: `npx typedoc`

---

## 📝 Summary

**JSDoc Template Created:** ✅  
**Standards Documented:** ✅  
**Top 10 Functions Identified:** ✅  
**1/10 Critical Functions Documented:** ✅  

**This provides:**
- Clear standards for all future development
- Templates for common patterns
- Path to 80% documentation coverage
- Foundation for automated doc generation

**Next:** Complete top 10 critical function documentation

