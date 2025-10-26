# 🚨 Error Handling Guide

## ✅ Custom Error Classes Created

All custom error types are now available in `lib/errors/custom-errors.ts`.

---

## 📋 Available Error Types

### 1. **ValidationError** (400)
Use when input validation fails

```typescript
import { ValidationError } from '@/lib/errors/custom-errors';

throw new ValidationError('Invalid email format', { 
  field: 'email', 
  value: user@invalid 
});
```

### 2. **AuthenticationError** (401)
Use when authentication is required or fails

```typescript
import { AuthenticationError } from '@/lib/errors/custom-errors';

throw new AuthenticationError('Invalid or expired token');
```

### 3. **AuthorizationError** (403)
Use when user lacks required permissions

```typescript
import { AuthorizationError } from '@/lib/errors/custom-errors';

throw new AuthorizationError('Admin access required', {
  required: 'admin',
  actual: 'user'
});
```

### 4. **NotFoundError** (404)
Use when resource doesn't exist

```typescript
import { NotFoundError } from '@/lib/errors/custom-errors';

throw new NotFoundError('Story', storyId);
```

### 5. **ConflictError** (409)
Use when operation conflicts with current state

```typescript
import { ConflictError } from '@/lib/errors/custom-errors';

throw new ConflictError('Story with this title already exists');
```

### 6. **RateLimitError** (429)
Use when rate limit is exceeded

```typescript
import { RateLimitError } from '@/lib/errors/custom-errors';

throw new RateLimitError('story-updates', 100, 3600);
```

### 7. **QuotaExceededError** (402)
Use when subscription quota is exceeded

```typescript
import { QuotaExceededError } from '@/lib/errors/custom-errors';

throw new QuotaExceededError('AI tokens', 5000, 5000, 'free');
```

### 8. **BusinessLogicError** (422)
Use when business rules are violated

```typescript
import { BusinessLogicError } from '@/lib/errors/custom-errors';

throw new BusinessLogicError('Cannot split a story that is already done');
```

### 9. **ExternalServiceError** (502)
Use when external API/service fails

```typescript
import { ExternalServiceError } from '@/lib/errors/custom-errors';

throw new ExternalServiceError('Anthropic API', 'Timeout after 30s');
```

### 10. **DatabaseError** (500)
Use when database operations fail

```typescript
import { DatabaseError } from '@/lib/errors/custom-errors';

try {
  await db.insert(stories).values(data);
} catch (error) {
  throw new DatabaseError('Failed to create story', error as Error);
}
```

### 11. **ConfigurationError** (500)
Use when configuration is invalid/missing

```typescript
import { ConfigurationError } from '@/lib/errors/custom-errors';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new ConfigurationError('ANTHROPIC_API_KEY not configured');
}
```

---

## 🎯 Usage Patterns

### In Services

```typescript
import { 
  ValidationError, 
  NotFoundError,
  QuotaExceededError 
} from '@/lib/errors/custom-errors';

export async function updateStory(storyId: string, data: UpdateData) {
  // Validation
  if (!data.title || data.title.length === 0) {
    throw new ValidationError('Title is required', { field: 'title' });
  }

  // Check existence
  const story = await db.query.stories.findFirst({
    where: eq(stories.id, storyId)
  });
  
  if (!story) {
    throw new NotFoundError('Story', storyId);
  }

  // Check quota
  const quota = await checkQuota(story.organizationId);
  if (quota.exceeded) {
    throw new QuotaExceededError(
      'story updates',
      quota.used,
      quota.limit,
      quota.tier
    );
  }

  // Perform update
  try {
    return await db.update(stories)
      .set(data)
      .where(eq(stories.id, storyId));
  } catch (error) {
    throw new DatabaseError('Failed to update story', error as Error);
  }
}
```

### In API Routes

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { 
  isApplicationError,
  formatErrorResponse 
} from '@/lib/errors/custom-errors';

export async function POST(request: NextRequest) {
  try {
    // Your logic here
    const result = await someService();
    return NextResponse.json(result);
    
  } catch (error) {
    // Custom errors are automatically formatted with correct status codes
    if (isApplicationError(error)) {
      return NextResponse.json(
        formatErrorResponse(error),
        { status: error.statusCode }
      );
    }

    // Unknown errors get 500 status
    return NextResponse.json(
      formatErrorResponse(error),
      { status: 500 }
    );
  }
}
```

### In Repositories

```typescript
import { DatabaseError, NotFoundError } from '@/lib/errors/custom-errors';

export class StoriesRepository {
  async getById(id: string) {
    try {
      const story = await db.query.stories.findFirst({
        where: eq(stories.id, id)
      });

      if (!story) {
        throw new NotFoundError('Story', id);
      }

      return story;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error; // Re-throw custom errors
      }
      throw new DatabaseError('Failed to fetch story', error as Error);
    }
  }
}
```

---

## 🔍 Type Guards

### Check if error is ApplicationError

```typescript
import { isApplicationError } from '@/lib/errors/custom-errors';

try {
  await riskyOperation();
} catch (error) {
  if (isApplicationError(error)) {
    console.log(`Error code: ${error.code}`);
    console.log(`Status: ${error.statusCode}`);
  } else {
    console.log('Unknown error type');
  }
}
```

### Check specific error type

```typescript
import { isErrorType, RateLimitError } from '@/lib/errors/custom-errors';

try {
  await apiCall();
} catch (error) {
  if (isErrorType(error, RateLimitError)) {
    const retryAfter = error.details?.retryAfter || 60;
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);
  }
}
```

---

## ✅ Best Practices

### 1. **Always Use Specific Error Types**
❌ Bad:
```typescript
throw new Error('Not found');
```

✅ Good:
```typescript
throw new NotFoundError('Story', storyId);
```

### 2. **Include Relevant Details**
❌ Bad:
```typescript
throw new ValidationError('Invalid input');
```

✅ Good:
```typescript
throw new ValidationError('Invalid input', {
  field: 'email',
  value: userInput,
  expected: 'valid email format'
});
```

### 3. **Catch and Re-throw Appropriately**
❌ Bad:
```typescript
try {
  await db.query();
} catch (error) {
  // Swallowing the error
}
```

✅ Good:
```typescript
try {
  await db.query();
} catch (error) {
  throw new DatabaseError('Query failed', error as Error);
}
```

### 4. **Log Errors with Context**
```typescript
import * as Sentry from '@sentry/nextjs';

try {
  await operation();
} catch (error) {
  if (isApplicationError(error)) {
    Sentry.captureException(error, {
      tags: {
        errorCode: error.code,
        statusCode: error.statusCode,
      },
      extra: error.details,
    });
  }
  throw error;
}
```

---

## 🎯 Migration Path

### Step 1: Import Custom Errors
```typescript
import { 
  ValidationError,
  NotFoundError,
  AuthorizationError,
  // ... other errors
} from '@/lib/errors/custom-errors';
```

### Step 2: Replace Generic Errors
Find:
```typescript
throw new Error('...');
```

Replace with appropriate error type:
```typescript
throw new ValidationError('...');
throw new NotFoundError('Resource', id);
// etc.
```

### Step 3: Update Error Handling
Find:
```typescript
} catch (error) {
  console.error(error);
  return { error: 'Something went wrong' };
}
```

Replace with:
```typescript
} catch (error) {
  if (isApplicationError(error)) {
    return NextResponse.json(
      formatErrorResponse(error),
      { status: error.statusCode }
    );
  }
  throw error;
}
```

---

## 📊 Error Handling Status

**Custom Error Classes:** ✅ Created (11 types)  
**Error Formatting Utilities:** ✅ Created  
**Type Guards:** ✅ Created  
**Documentation:** ✅ Complete  
**Migration:** 🔄 In Progress (use in new code)

---

## 🚀 Next Steps

1. ✅ Use custom errors in all new code
2. Gradually migrate existing code
3. Add error tracking with Sentry
4. Create error handling tests
5. Document common error scenarios

---

This provides a robust foundation for production-ready error handling! 🎉

