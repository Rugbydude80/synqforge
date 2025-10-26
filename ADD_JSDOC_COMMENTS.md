# 📝 JSDoc Comments - Implementation Plan

## Strategy

Add comprehensive JSDoc comments to:
1. All exported functions in services
2. Complex business logic functions
3. Repository methods
4. Utility functions
5. API route handlers

## Files to Document (Priority Order)

### High Priority (Core Business Logic)
1. `lib/services/ai.service.ts` - AI story generation
2. `lib/repositories/stories.repository.ts` - Story CRUD
3. `lib/entitlements/checkStoryUpdate.ts` - Subscription logic
4. `lib/services/story-split.service.ts` - Story splitting
5. `lib/services/velocity.service.ts` - Analytics

### Medium Priority
6. `lib/repositories/tasks.repository.ts` - Task management
7. `lib/repositories/epics.ts` - Epic management
8. `lib/services/addOnService.ts` - Add-on purchases
9. `lib/middleware/auth.ts` - Authentication
10. `lib/services/tokenService.ts` - Token management

### Template for JSDoc Comments

```typescript
/**
 * Brief one-line description of what this function does
 * 
 * Longer description with more context about:
 * - What problem this solves
 * - Important behaviors or side effects
 * - Any assumptions made
 * 
 * @param {Type} paramName - Description of the parameter
 * @param {Type} [optionalParam] - Description (optional)
 * @returns {ReturnType} Description of what is returned
 * @throws {ErrorType} When and why this error is thrown
 * 
 * @example
 * ```typescript
 * const result = await functionName('input');
 * console.log(result); // Expected output
 * ```
 */
```

## Starting Implementation...

