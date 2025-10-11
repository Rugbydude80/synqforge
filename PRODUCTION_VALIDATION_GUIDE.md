# Production Validation Guide

This guide provides a comprehensive validation framework for signing off on production deployment of the CRUD functionality (Projects, Epics, Stories).

## Quick Start

### Automated Testing

```bash
# 1. Run the main validation suite (automated checks)
./scripts/validate-production.sh

# 2. Run RLS & security tests (requires auth tokens)
export USER_A_TOKEN="your_user_a_token"
export USER_B_TOKEN="your_user_b_token"
export PROJECT_A_ID="test_project_id"
./scripts/test-rls-security.sh

# 3. Run performance tests
./scripts/performance-test.sh

# 4. Complete manual testing using the checklist
open scripts/manual-test-checklist.md
```

### Manual Testing

Complete the comprehensive manual test checklist:
```bash
open scripts/manual-test-checklist.md
```

---

## Validation Categories

### 🔒 MUST-PASS (Blockers)

These tests **must** pass before production deployment:

1. **RLS & Data Security**
   - Cross-tenant isolation (no data leakage)
   - Permission checks (403 for unauthorized)
   - Rate limiting (429 responses)

2. **Publish Epic End-to-End**
   - Status transition (draft → published)
   - Audit trail (publishedBy, publishedAt)
   - Notification generation (once, no duplicates)
   - Realtime updates (<2s)

3. **CRUD Integrity**
   - All create/edit/delete operations work
   - Validation (empty fields, XSS, extreme lengths)
   - Concurrency handling (last write wins)
   - Delete cascade rules (no orphaned data)

4. **Stories Page Filters/Search**
   - Filter combinations work correctly
   - Deep-link state restoration
   - Result counts match board views
   - Zero-result friendly states

5. **Realtime & Optimistic UI**
   - Updates appear in <2s across sessions
   - Optimistic updates rollback on error
   - No ghost cards after errors

6. **Performance & Loading**
   - P95 GET /api/stories (filtered): <500ms
   - P95 POST /api/epics/{id}/publish: <1s
   - P95 TTI Stories page: <1.5s
   - Skeletons shown <150ms
   - CLS <0.1 (no layout shift)

7. **Observability**
   - Sentry captures errors with context
   - Audit log entries for all mutations
   - Health check endpoint returns 200
   - Uptime monitoring configured

### ⚠️ SHOULD-PASS (Recommended)

These tests are recommended but not blocking:

8. **Accessibility & UX Polish**
   - Keyboard navigation (tab, escape, enter)
   - Focus trap in modals
   - ARIA labels on buttons
   - axe-core scan clean (0 critical)
   - High-contrast mode support

9. **AI Flows Regression**
   - Story generation works in published/draft epics
   - Batch creation respects filters
   - Generated stories appear in correct project/epic

---

## Test Scripts

### 1. `validate-production.sh`

**Main automated validation suite** - checks code patterns, file structure, and generates comprehensive report.

**What it tests:**
- Presence of RLS policies
- Auth middleware configuration
- Rate limiting implementation
- CRUD endpoint existence
- Validation logic
- XSS protection measures
- Realtime implementation
- Loading states
- ARIA attributes
- Error tracking setup
- Audit logging
- Health check endpoints

**Usage:**
```bash
./scripts/validate-production.sh
```

**Output:**
- `validation-results-[timestamp].md` - Full markdown report with pass/fail for each test
- Console summary of automated test results

**Exit codes:**
- 0: All MUST-PASS tests passed
- 1: One or more MUST-PASS tests failed

---

### 2. `test-rls-security.sh`

**RLS & cross-tenant security testing** - validates data isolation and permissions.

**What it tests:**
- User B cannot access User A's projects/epics/stories
- User B cannot see User A's data in list endpoints
- User B cannot update/delete User A's data
- User B cannot publish User A's epics
- Unauthenticated requests blocked (401/403)
- Rate limiting active (429 after threshold)

**Requirements:**
You need two user accounts in different organizations and their authentication tokens.

**Setup:**
```bash
# 1. Log in as User A, get auth token from browser DevTools:
# Application → Cookies → Copy relevant auth cookie/token

# 2. Log in as User B (different org), get auth token

# 3. Get test data IDs:
# - A project ID owned by User A
# - An epic ID owned by User A
# - A story ID owned by User A

# 4. Set environment variables:
export USER_A_TOKEN="eyJhbGc..."
export USER_B_TOKEN="eyJhbGc..."
export PROJECT_A_ID="cm123abc"
export EPIC_A_ID="cm456def"
export STORY_A_ID="cm789ghi"

# 5. Run tests:
./scripts/test-rls-security.sh
```

**Output:**
- `rls-security-results-[timestamp].md` - Detailed report of each security test

**Critical:** All tests must pass. Any failures indicate potential data leakage or unauthorized access vulnerabilities.

---

### 3. `performance-test.sh`

**API performance measurement** - measures response times and generates P95 statistics.

**What it tests:**
- Health check endpoint (baseline)
- GET /api/stories (filtered) - **MUST be <500ms P95**
- GET /api/stories (all)
- GET /api/stories/:id
- GET /api/projects
- GET /api/epics
- POST /api/epics/:id/publish - **MUST be <1s P95**
- POST /api/stories (create)

**Usage:**
```bash
# Test against local development
./scripts/performance-test.sh

# Test against staging
BASE_URL="https://staging.yourdomain.com" ./scripts/performance-test.sh

# Test against production
BASE_URL="https://yourdomain.com" ./scripts/performance-test.sh
```

**Output:**
- `performance-results-[timestamp].json` - Raw JSON data
- `performance-report-[timestamp].md` - Formatted markdown report with P50/P95/P99 statistics

**Targets:**
- ✅ PASS if P95 meets target
- ❌ FAIL if P95 exceeds target

**Note:** Run multiple times and average results for accurate measurements. Network conditions affect results.

---

### 4. `manual-test-checklist.md`

**Comprehensive manual testing checklist** - 100+ test cases covering all functionality.

**What it covers:**
- Permissions & data security (9 tests)
- Publish epic end-to-end (6 tests)
- CRUD integrity & edge cases (16 tests)
- Stories page filters/search (12 tests)
- Realtime & optimistic UI (10 tests)
- Performance & loading (7 tests)
- Accessibility & UX polish (11 tests)
- Observability (9 tests)
- AI flows regression (8 tests)

**How to use:**
1. Print or open in a text editor
2. Set up test environment (users, test data)
3. Execute each test step-by-step
4. Record results in "Result" fields
5. Complete sign-off at the end

**Structure:**
- **Setup Requirements** - test users and data needed
- **Test Categories** - organized by functionality
- **Expected Results** - clear pass/fail criteria
- **Summary & Sign-Off** - final go/no-go decision

---

## Go/No-Go Criteria

### ✅ READY FOR PRODUCTION

All of the following must be true:

- [ ] All MUST-PASS automated tests pass (validate-production.sh exit code 0)
- [ ] All RLS/security tests pass (test-rls-security.sh)
- [ ] Performance targets met (performance-test.sh shows P95 within targets)
- [ ] Manual testing checklist completed
- [ ] No critical issues found in manual testing
- [ ] All blockers resolved
- [ ] Observability confirmed (errors captured, audit trail working)

**Optional but recommended:**
- [ ] Accessibility tests pass (0 critical issues)
- [ ] AI regression tests pass

### ❌ NOT READY FOR PRODUCTION

If any of the following are true:

- [ ] RLS/security test failures (data leakage or unauthorized access)
- [ ] Performance targets not met (P95 > targets)
- [ ] CRUD operations fail or lose data
- [ ] Realtime updates not working (<2s requirement)
- [ ] Observability not capturing errors
- [ ] Manual testing reveals critical bugs

---

## Validation Workflow

### Phase 1: Automated Testing (30 minutes)

```bash
# Run all automated tests
./scripts/validate-production.sh
./scripts/test-rls-security.sh  # requires env vars
./scripts/performance-test.sh

# Review generated reports
ls -lt validation-results-*.md
ls -lt rls-security-results-*.md
ls -lt performance-report-*.md
```

**Action:** Fix any failures, re-run tests until all pass.

---

### Phase 2: Manual Testing (2-4 hours)

```bash
# Open checklist
open scripts/manual-test-checklist.md
```

**Setup:**
1. Create two test user accounts (different orgs)
2. Create test data (projects, epics, stories)
3. Open two browser sessions (different profiles)

**Execute:**
- Work through each test category systematically
- Record results for each test
- Document any issues found

**Action:** Fix critical issues, re-test affected areas.

---

### Phase 3: Performance Validation (1 hour)

**On staging environment:**

```bash
BASE_URL="https://staging.yourdomain.com" ./scripts/performance-test.sh
```

**Manual measurements:**
1. Open DevTools → Network tab
2. Load Stories page 5x (cold cache)
3. Record P95 TTI
4. Load Stories page 5x (warm cache)
5. Record P95 TTI
6. Measure publish epic latency 5x

**Action:** Optimize slow endpoints, re-test.

---

### Phase 4: Sign-Off (15 minutes)

**Review:**
- [ ] All automated test reports
- [ ] Manual test checklist completed
- [ ] Performance measurements documented
- [ ] No outstanding critical issues

**Decision:**
- **GO:** All MUST-PASS criteria met → Deploy to production
- **NO-GO:** Blockers exist → Fix and re-validate

**Document:**
- Sign off in manual-test-checklist.md
- Archive all test reports
- Note any known non-blocking issues

---

## Common Issues & Troubleshooting

### RLS Tests Failing

**Symptom:** Cross-tenant tests show unauthorized access

**Check:**
1. Database RLS policies enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
2. Organization filtering in API route handlers
3. Supabase/Drizzle RLS configuration

**Fix:**
```sql
-- Example RLS policy
CREATE POLICY "Users can only see their org's projects"
  ON projects
  FOR SELECT
  USING (organization_id = auth.get_current_org_id());
```

---

### Performance Tests Failing

**Symptom:** P95 latency exceeds targets

**Check:**
1. Database indexes on frequently queried columns
2. N+1 query problems (use EXPLAIN ANALYZE)
3. Network latency (test locally vs. staging)
4. Database connection pooling

**Optimize:**
- Add indexes: `CREATE INDEX idx_stories_project_id ON stories(project_id);`
- Use `select` to limit columns: `db.select({ id, title }).from(stories)`
- Batch queries with `Promise.all()` where possible
- Enable query caching

---

### Realtime Tests Failing

**Symptom:** Updates don't appear in other sessions

**Check:**
1. Supabase Realtime enabled on tables
2. `revalidatePath()` or `router.refresh()` called after mutations
3. WebSocket connection active (DevTools → Network → WS)
4. React Query cache invalidation

**Fix:**
```typescript
// After mutation
await db.insert(stories).values(newStory);
revalidatePath('/stories');
```

---

### Observability Tests Failing

**Symptom:** Errors not captured in Sentry

**Check:**
1. `SENTRY_DSN` environment variable set
2. Sentry initialized in `instrumentation.ts`
3. Error boundaries in React components
4. `Sentry.captureException()` in catch blocks

**Fix:**
```typescript
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: 'stories' },
    user: { id: userId, org: orgId }
  });
  throw error;
}
```

---

## Test Data Setup

### Creating Test Users

**Option 1: Manual (UI)**
1. Create Account A: `test-user-a@example.com`
2. Create Organization A: "Test Org Alpha"
3. Create Account B: `test-user-b@example.com`
4. Create Organization B: "Test Org Beta"

**Option 2: Seed Script**
```typescript
// scripts/seed-test-data.ts
import { db } from '@/lib/db';
import { organizations, users, projects } from '@/db/schema';

async function seed() {
  // Insert orgs
  const [orgA] = await db.insert(organizations).values({
    name: 'Test Org Alpha',
    slug: 'test-org-alpha'
  }).returning();

  // Insert users
  const [userA] = await db.insert(users).values({
    email: 'test-a@example.com',
    organizationId: orgA.id
  }).returning();

  // Insert test projects, epics, stories...
}

seed();
```

---

### Getting Authentication Tokens

**Browser DevTools method:**
1. Log in as test user
2. Open DevTools → Application → Cookies
3. Copy session cookie or JWT token
4. Export as environment variable:
   ```bash
   export USER_A_TOKEN="your_token_here"
   ```

**API method:**
```bash
# If you have a login endpoint
curl -X POST https://your-app.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test-a@example.com","password":"test123"}' \
  | jq -r '.token'
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/production-validation.yml
name: Production Validation

on:
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run validation suite
        run: ./scripts/validate-production.sh

      - name: Run performance tests
        run: ./scripts/performance-test.sh
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}

      - name: Upload test reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: validation-reports
          path: |
            validation-results-*.md
            performance-report-*.md

      - name: Comment PR with results
        uses: actions/github-script@v6
        if: always()
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('validation-results-latest.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Validation Results\n\n${report}`
            });
```

---

## Production Deployment Checklist

Before deploying to production, ensure:

### Pre-Deployment
- [ ] All validation tests pass
- [ ] Performance targets met on staging
- [ ] Database migrations tested and reversible
- [ ] Environment variables configured
- [ ] Feature flags ready (if applicable)

### Deployment
- [ ] Deploy during low-traffic window
- [ ] Monitor error rates (Sentry)
- [ ] Monitor performance (DevTools, APM)
- [ ] Run smoke tests on production

### Post-Deployment
- [ ] Health check returns 200
- [ ] Verify RLS policies active (run security tests)
- [ ] Monitor for 1 hour: error rates, latency, uptime
- [ ] Test key user flows manually
- [ ] Announce to team/users

### Rollback Plan
- [ ] Previous deployment version tagged
- [ ] Rollback command ready: `git revert` or redeploy previous version
- [ ] Database migration rollback tested
- [ ] Communication plan if rollback needed

---

## Support & Documentation

### Additional Resources
- [Claude Code Docs](https://docs.claude.com/en/docs/claude-code/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)

### Getting Help
- **Issues:** https://github.com/your-repo/issues
- **Internal docs:** See [CRUD_IMPLEMENTATION_SUMMARY.md](./CRUD_IMPLEMENTATION_SUMMARY.md)

---

**Last Updated:** 2025-10-11
**Version:** 1.0
**Maintained by:** Engineering Team
