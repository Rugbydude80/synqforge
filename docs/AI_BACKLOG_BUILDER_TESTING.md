# AI Backlog Builder Testing Guide

This document explains how to run the comprehensive test suite for the AI Backlog Builder system (v1.3).

## Overview

The test suite validates all implemented features including:

- ✅ Story decomposition with soft/hard caps
- ✅ Story generation with all validation rules
- ✅ Auto-fix transformations with safety constraints
- ✅ Quality scoring and ready-for-sprint gate
- ✅ Idempotency for stories and epics
- ✅ Epic linkage (parent/sibling relationships)
- ✅ Interactive AC detection and cross-checking
- ✅ Performance timing validation
- ✅ WCAG compliance checking
- ✅ No-results and AND-logic validation
- ✅ Observability metrics and PII redaction
- ✅ Schema validation at API boundaries

## Prerequisites

### 1. Environment Setup

The integration tests require a running instance of the application with:

- Database configured and migrated
- Authentication system active
- AI services configured (Anthropic API)

### 2. Environment Variables

Set the following environment variables before running the tests:

```bash
export TEST_BASE_URL="http://localhost:3000"  # Or your deployed URL
export TEST_AUTH_TOKEN="your-test-user-auth-token"
```

#### Getting a Test Auth Token

You have several options:

**Option A: Use an existing user session**
1. Sign in to your application
2. Open browser DevTools → Application → Cookies
3. Copy the `next-auth.session-token` value
4. Use this as your `TEST_AUTH_TOKEN`

**Option B: Create a test user via API**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'
```

**Option C: Use the test database seed script** (if available)
```bash
npm run db:seed:test
```

## Running the Tests

### Run All AI Backlog Builder Tests

```bash
npm run test:ai-backlog-builder
```

### Run All Integration Tests

```bash
npm run test:integration
```

### Run All Unit Tests

```bash
npm run test:unit
```

### Run All Tests

```bash
npm test
```

### Run Tests with Debugging

```bash
NODE_OPTIONS='--inspect-brk' npm run test:ai-backlog-builder
```

## Test Scenarios

### Scenario 1: Large Story Decomposition

Tests the decomposition engine's ability to break down complex stories:

- ✅ Detects when split is recommended (≥3 capabilities)
- ✅ Triggers soft cap warning (>4 capabilities)
- ✅ Identifies natural capability boundaries
- ✅ Suggests merges for similar capabilities
- ✅ Assigns appropriate themes (WCAG, performance, etc.)

**Expected Output:**
```
✓ should decompose large story and trigger all rules (842ms)
```

### Scenario 2: Story Generation with Validation Rules

Tests story generation with all validation rules applied:

#### Test A: Category Filtering Story
- Performance timing in interactive ACs
- No-results case handling
- AND-logic coverage
- Clear/reset functionality

#### Test B: Mobile Interface Story
- WCAG 2.1 AA compliance
- Touch target sizing (≥44×44px)
- Accessibility features (focus indicators, semantic labels)
- Edge case handling

#### Test C: Persistence Story
- Session state management
- Navigation/refresh persistence
- Technical hints separation

### Scenario 3: Auto-Fix Functionality

Tests automatic correction of common issues:

- ✅ Split compound Then clauses
- ✅ Insert missing no-results AC
- ✅ Add performance timing to interactive ACs
- ✅ Rewrite passive voice (with safety checks)

**Expected Output:**
```
✓ should split compound Then clauses (234ms)
✓ should insert missing no-results AC (189ms)
✓ should add performance timing to interactive ACs (267ms)
```

### Scenario 4: Idempotency Testing

Tests duplicate prevention mechanisms:

- ✅ Story duplication prevention (same requestId)
- ✅ Epic duplication prevention (stable correlation key)
- ✅ Metrics tracking for duplication prevention

### Scenario 5: Epic Linkage

Tests parent/sibling relationship management:

- ✅ Parent epic relationship
- ✅ Sibling epic arrays
- ✅ Decomposition batch ID matching

### Scenario 6: Quality Scoring

Tests the quality scoring and ready-for-sprint gate:

- ✅ High quality stories pass (score ≥8.0)
- ✅ Low quality stories require review (score ≤6.9)
- ✅ Ready-for-sprint gate logic
- ✅ Manual review flags

### Scenario 7: Schema Validation

Tests API boundary validation:

- ✅ Accept valid payloads
- ✅ Reject invalid estimate_points
- ✅ Reject unknown fields (if strict mode enabled)

### Scenario 8: Observability

Tests metrics emission and PII redaction:

- ✅ PII redaction in audit logs
- ✅ Metrics emission for all operations

### End-to-End Integration Flow

Tests the complete workflow:

1. Decompose large story → capabilities
2. Generate stories for each capability
3. Validate each generated story
4. Build epic with all stories

## Test Output

### Successful Run

```
▶ AI Backlog Builder - Integration Tests
  ▶ Scenario 1: Large Story Decomposition
    ✓ should decompose large story and trigger all rules (842ms)
  ▶ Scenario 2: Story Generation with Validation Rules
    ✓ Category Filtering Story - Tests Performance + No-Results + AND-Logic (456ms)
    ✓ Mobile Interface Story - Tests WCAG + Touch Targets + Accessibility (378ms)
    ✓ Persistence Story - Tests Session State (234ms)
  ▶ Scenario 3: Auto-Fix Functionality
    ✓ should split compound Then clauses (234ms)
    ✓ should insert missing no-results AC (189ms)
    ✓ should add performance timing to interactive ACs (267ms)
  ...

▶ End-to-End Integration Flow
  ✓ full workflow: decompose -> generate -> validate -> build epic (2145ms)

✔ All tests passed
```

### Failed Test

```
✖ should decompose large story and trigger all rules (842ms)
  AssertionError: Should recommend split (≥3 capabilities)
      at Test.<anonymous> (tests/integration/ai-backlog-builder.test.ts:87:14)
```

## Debugging Failed Tests

### 1. Check API Responses

Add console.log to inspect responses:

```typescript
const response = await apiCall('/api/ai/decompose', 'POST', payload)
console.log('Response:', JSON.stringify(response, null, 2))
```

### 2. Verify Authentication

```bash
curl -H "Authorization: Bearer $TEST_AUTH_TOKEN" \
     http://localhost:3000/api/users/me
```

### 3. Check Database State

```bash
npm run db:studio
```

### 4. Review Application Logs

```bash
npm run dev
# Watch logs while tests run
```

### 5. Test Individual Scenarios

Comment out other tests and run specific scenarios:

```typescript
test.only('should decompose large story and trigger all rules', async () => {
  // ...
})
```

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/test.yml`:

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run db:migrate
      - run: npm run test:unit
      - run: npm run test:integration
        env:
          TEST_BASE_URL: http://localhost:3000
          TEST_AUTH_TOKEN: ${{ secrets.TEST_AUTH_TOKEN }}
```

## Performance Considerations

### Test Execution Time

- Unit tests: ~5 seconds
- Integration tests: ~30-60 seconds (depends on API response times)
- E2E flow: ~2-5 seconds per test

### Optimization Tips

1. **Run tests in parallel** (when Node test runner supports it)
2. **Use test database** with pre-seeded data
3. **Mock external AI calls** for faster unit tests
4. **Cache authentication tokens** between test runs

## Troubleshooting

### "Tests require TEST_AUTH_TOKEN"

**Solution:** Set the environment variable before running tests:
```bash
export TEST_AUTH_TOKEN="your-token"
npm run test:ai-backlog-builder
```

### "Connection refused" or 500 errors

**Solution:** Ensure the dev server is running:
```bash
npm run dev
# In another terminal:
npm run test:ai-backlog-builder
```

### "Rate limit exceeded"

**Solution:** Wait for rate limit to reset or use a different test user:
```bash
# Use a dedicated test organization with higher limits
export TEST_AUTH_TOKEN="test-org-token"
```

### Tests are flaky

**Solution:**
1. Add retry logic for network requests
2. Increase timeouts for slow operations
3. Use test database with predictable data
4. Mock AI service responses

## Coverage

Generate test coverage reports:

```bash
# Install c8 for coverage
npm install --save-dev c8

# Run tests with coverage
npx c8 npm run test:ai-backlog-builder
```

## Contributing

When adding new features to the AI Backlog Builder:

1. ✅ Add corresponding test scenarios
2. ✅ Update this documentation
3. ✅ Ensure all existing tests still pass
4. ✅ Add new test cases for edge cases
5. ✅ Update the test specification if behavior changes

## References

- [Test Specification](./AI_BACKLOG_BUILDER_TEST_SPEC.md) - Complete test specification
- [Implementation Guide](./BACKLOG_ENGINE.md) - System implementation details
- [API Documentation](./API.md) - API endpoint documentation
- [Node Test Runner Docs](https://nodejs.org/api/test.html) - Official test runner documentation

## Success Criteria

The test suite should verify:

✅ **Decomposition:** Large stories split into ≤4 capabilities (soft cap warning at >4)  
✅ **Generation:** Stories have 4-7 atomic ACs with proper themes  
✅ **Validation:** Auto-fix applied with named transformations  
✅ **Quality:** Scores calculated and clamped [0.0, 10.0]  
✅ **Idempotency:** No duplicates created on retry  
✅ **Epic Linkage:** Parent/sibling relationships maintained  
✅ **Ready Gate:** `ready_for_sprint = ok && !manual_review && score >= threshold`  
✅ **Observability:** All metrics emitted and PII redacted  
✅ **Schemas:** API boundaries enforce strict validation  

---

Last Updated: October 23, 2025
Version: 1.3.0

