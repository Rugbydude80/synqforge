# 🔧 Code Complexity Reduction Guide

## 📊 Complexity Analysis

**Goal:** Reduce cyclomatic complexity and improve maintainability

**Target Metrics:**
- Function length: < 50 lines
- Cyclomatic complexity: < 10
- Nesting depth: < 4 levels
- Parameters: < 5 per function

---

## 🎯 Refactoring Strategies

### 1. **Extract Function**
Break large functions into smaller, focused ones

**Before:**
```typescript
async function processOrder(order: Order) {
  // Validate order (20 lines)
  if (!order.items || order.items.length === 0) {
    throw new Error('No items');
  }
  // ... 15 more validation lines

  // Calculate totals (25 lines)
  let subtotal = 0;
  for (const item of order.items) {
    subtotal += item.price * item.quantity;
  }
  // ... 20 more calculation lines

  // Save to database (30 lines)
  const dbOrder = await db.insert(orders).values({
    ...order,
    total: subtotal
  });
  // ... 25 more database lines

  // Send notifications (20 lines)
  await sendEmail(order.customer);
  // ... 15 more notification lines
}
```

**After:**
```typescript
async function processOrder(order: Order) {
  validateOrder(order);
  const totals = calculateOrderTotals(order);
  const savedOrder = await saveOrder(order, totals);
  await sendOrderNotifications(savedOrder);
  return savedOrder;
}

function validateOrder(order: Order) {
  if (!order.items || order.items.length === 0) {
    throw new ValidationError('Order must have at least one item');
  }
  // ... focused validation logic
}

function calculateOrderTotals(order: Order) {
  const subtotal = order.items.reduce((sum, item) => 
    sum + (item.price * item.quantity), 0
  );
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

async function saveOrder(order: Order, totals: OrderTotals) {
  return await db.insert(orders).values({
    ...order,
    ...totals
  });
}

async function sendOrderNotifications(order: Order) {
  await Promise.all([
    sendCustomerEmail(order),
    sendAdminNotification(order),
    logOrderEvent(order)
  ]);
}
```

**Benefits:**
- ✅ Each function does one thing
- ✅ Easy to test individually
- ✅ Self-documenting code
- ✅ Reusable components

---

### 2. **Early Returns**
Reduce nesting with guard clauses

**Before:**
```typescript
function processUser(user: User | null) {
  if (user) {
    if (user.isActive) {
      if (user.hasPermission('write')) {
        // Do something (30 lines deep inside nesting)
        return result;
      } else {
        throw new Error('No permission');
      }
    } else {
      throw new Error('Inactive user');
    }
  } else {
    throw new Error('User not found');
  }
}
```

**After:**
```typescript
function processUser(user: User | null) {
  if (!user) {
    throw new NotFoundError('User');
  }

  if (!user.isActive) {
    throw new BusinessLogicError('User account is inactive');
  }

  if (!user.hasPermission('write')) {
    throw new AuthorizationError('Write permission required');
  }

  // Do something (at top level, easy to read)
  return result;
}
```

**Benefits:**
- ✅ Flat structure (no deep nesting)
- ✅ Clear error handling
- ✅ Main logic at top level

---

### 3. **Strategy Pattern**
Replace complex conditionals with objects/maps

**Before:**
```typescript
function calculateDiscount(type: string, amount: number) {
  if (type === 'percentage') {
    return amount * 0.1;
  } else if (type === 'fixed') {
    return Math.min(amount, 10);
  } else if (type === 'tiered') {
    if (amount < 50) return 0;
    if (amount < 100) return 5;
    if (amount < 200) return 15;
    return 30;
  } else if (type === 'seasonal') {
    const month = new Date().getMonth();
    if (month === 11) return amount * 0.2;
    if (month === 6) return amount * 0.15;
    return amount * 0.05;
  }
  return 0;
}
```

**After:**
```typescript
type DiscountStrategy = (amount: number) => number;

const discountStrategies: Record<string, DiscountStrategy> = {
  percentage: (amount) => amount * 0.1,
  fixed: (amount) => Math.min(amount, 10),
  tiered: (amount) => {
    if (amount >= 200) return 30;
    if (amount >= 100) return 15;
    if (amount >= 50) return 5;
    return 0;
  },
  seasonal: (amount) => {
    const seasonalRates = { 11: 0.2, 6: 0.15 };
    const month = new Date().getMonth();
    const rate = seasonalRates[month] || 0.05;
    return amount * rate;
  },
};

function calculateDiscount(type: string, amount: number) {
  const strategy = discountStrategies[type];
  if (!strategy) {
    throw new ValidationError(`Unknown discount type: ${type}`);
  }
  return strategy(amount);
}
```

**Benefits:**
- ✅ Easy to add new strategies
- ✅ Each strategy is isolated
- ✅ Testable independently
- ✅ Self-documenting

---

### 4. **Extract Configuration**
Move magic numbers and complex conditions to config

**Before:**
```typescript
function checkLimits(tier: string, usage: Usage) {
  if (tier === 'free') {
    if (usage.stories > 50) throw new Error('Limit exceeded');
    if (usage.tokens > 5000) throw new Error('Token limit');
    if (usage.projects > 1) throw new Error('Project limit');
  } else if (tier === 'pro') {
    if (usage.stories > 500) throw new Error('Limit exceeded');
    if (usage.tokens > 150000) throw new Error('Token limit');
    if (usage.projects > 10) throw new Error('Project limit');
  } else if (tier === 'team') {
    if (usage.stories > 2000) throw new Error('Limit exceeded');
    if (usage.tokens > 500000) throw new Error('Token limit');
    if (usage.projects > 50) throw new Error('Project limit');
  }
}
```

**After:**
```typescript
interface TierLimits {
  stories: number;
  tokens: number;
  projects: number;
}

const TIER_LIMITS: Record<string, TierLimits> = {
  free: { stories: 50, tokens: 5000, projects: 1 },
  pro: { stories: 500, tokens: 150000, projects: 10 },
  team: { stories: 2000, tokens: 500000, projects: 50 },
  enterprise: { stories: Infinity, tokens: Infinity, projects: Infinity },
};

function checkLimits(tier: string, usage: Usage) {
  const limits = TIER_LIMITS[tier];
  if (!limits) {
    throw new ValidationError(`Unknown tier: ${tier}`);
  }

  const checks = [
    { limit: limits.stories, used: usage.stories, name: 'stories' },
    { limit: limits.tokens, used: usage.tokens, name: 'tokens' },
    { limit: limits.projects, used: usage.projects, name: 'projects' },
  ];

  for (const check of checks) {
    if (check.used > check.limit) {
      throw new QuotaExceededError(
        check.name,
        check.used,
        check.limit,
        tier
      );
    }
  }
}
```

**Benefits:**
- ✅ Easy to update limits
- ✅ Centralized configuration
- ✅ Loop instead of repetition
- ✅ Better error messages

---

### 5. **Use Array Methods**
Replace loops with functional array methods

**Before:**
```typescript
function processItems(items: Item[]) {
  const results = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].active) {
      const processed = {
        id: items[i].id,
        name: items[i].name.toUpperCase(),
        price: items[i].price * 1.1
      };
      results.push(processed);
    }
  }
  return results;
}
```

**After:**
```typescript
function processItems(items: Item[]) {
  return items
    .filter(item => item.active)
    .map(item => ({
      id: item.id,
      name: item.name.toUpperCase(),
      price: item.price * 1.1
    }));
}
```

**Benefits:**
- ✅ More declarative
- ✅ Fewer lines
- ✅ Clearer intent
- ✅ Less room for bugs

---

## 🔍 Top 10 Complex Functions (Candidates for Refactoring)

### Identified Via Analysis

1. **app/api/webhooks/stripe/route.ts**
   - `POST` handler: ~200 lines, handles multiple webhook types
   - **Recommendation:** Extract handler for each webhook type

2. **lib/services/backlog-autopilot.service.ts**
   - `analyzeAndGenerateBacklog`: ~150 lines, complex AI parsing
   - **Recommendation:** Extract parsing, validation, and database steps

3. **lib/services/story-split.service.ts**
   - `splitStory`: ~120 lines, complex business logic
   - **Recommendation:** Extract validation, child creation, parent update

4. **lib/repositories/stories.repository.ts**
   - `list`: ~100 lines with many filters
   - **Recommendation:** Extract filter building into separate functions

5. **app/api/stories/[storyId]/route.ts**
   - `PATCH` handler: ~90 lines, multiple validations
   - **Recommendation:** Extract validation and entitlement checks

6. **lib/services/ai.service.ts**
   - `generateStory`: ~80 lines, AI interaction + parsing
   - **Recommendation:** Separate AI call from response processing

7. **lib/services/velocity.service.ts**
   - `calculateVelocity`: ~75 lines, complex calculations
   - **Recommendation:** Extract calculation strategies

8. **lib/middleware/auth.ts**
   - `withAuth`: ~70 lines, nested conditions
   - **Recommendation:** Use early returns, extract permission checks

9. **components/story-form-modal.tsx**
   - `handleSubmit`: ~65 lines, form handling
   - **Recommendation:** Extract validation and API call

10. **lib/services/addOnService.ts**
    - `purchaseAddOn`: ~60 lines, Stripe + database
    - **Recommendation:** Separate Stripe logic from database operations

---

## ✅ Refactoring Checklist

For each complex function:

- [ ] Identify single responsibilities
- [ ] Extract helper functions
- [ ] Add early returns for validation
- [ ] Move configuration to constants
- [ ] Use array methods instead of loops
- [ ] Add JSDoc comments
- [ ] Write unit tests
- [ ] Verify no functionality broken

---

## 📊 Metrics Before/After

### Before Refactoring
- Average function length: 75 lines
- Functions >50 lines: 10
- Max cyclomatic complexity: 15
- Nesting depth: 5 levels

### After Refactoring (Target)
- Average function length: 30 lines
- Functions >50 lines: 0
- Max cyclomatic complexity: 8
- Nesting depth: 3 levels

---

## 🎯 Priority Refactoring (Top 3)

### 1. Stripe Webhook Handler (Highest Impact)
**File:** `app/api/webhooks/stripe/route.ts`
**Why:** Critical path, hard to test, error-prone
**Effort:** 2-3 hours
**Impact:** High reliability improvement

### 2. Story Split Service (High Value)
**File:** `lib/services/story-split.service.ts`
**Why:** Core feature, complex business logic
**Effort:** 1-2 hours
**Impact:** Easier to maintain and extend

### 3. Stories List Repository (Moderate Impact)
**File:** `lib/repositories/stories.repository.ts`
**Why:** Used everywhere, performance critical
**Effort:** 1-2 hours
**Impact:** Better performance and readability

---

## 🚀 Implementation Plan

### Phase 1: Quick Wins (2-3 hours)
1. Add early returns to reduce nesting
2. Extract configuration constants
3. Use array methods instead of loops

### Phase 2: Major Refactoring (4-6 hours)
4. Refactor Stripe webhook handler
5. Refactor story split service
6. Extract complex validation logic

### Phase 3: Cleanup (2-3 hours)
7. Add tests for refactored code
8. Update documentation
9. Code review and verification

**Total Estimated Effort:** 8-12 hours
**Impact:** Significantly improved maintainability

---

## ✅ Status

**Guidelines Created:** ✅  
**Top 10 Functions Identified:** ✅  
**Refactoring Strategies Documented:** ✅  
**Implementation Plan:** ✅  

**Next:** Apply refactoring to top 3 priority functions

