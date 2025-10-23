# SynqForge Test Suite

## Quick Commands

```bash
# Quick tests (unit + lint + typecheck) - No server needed
npm run test:quick

# AI Backlog Builder tests with environment checks
npm run test:ai

# All unit tests
npm run test:unit

# All integration tests  
npm run test:integration

# All tests
npm test
```

## Test Structure

```
tests/
├── unit/                    # Unit tests (fast, no server needed)
│   ├── urls.test.ts
│   └── validate-story-schema.test.ts
├── integration/             # Integration tests (require running server)
│   └── ai-backlog-builder.test.ts   ← Comprehensive AI tests
└── e2e/                     # End-to-end tests
    └── story-journey.spec.ts
```

## AI Backlog Builder Tests

**Coverage:** 18 test cases across 9 scenarios  
**Status:** ✅ All passing  
**Duration:** ~580ms

### Test Scenarios:
1. ✅ Large Story Decomposition
2. ✅ Story Generation (3 variants)
3. ✅ Auto-Fix Functionality (4 types)
4. ✅ Idempotency Testing
5. ✅ Epic Linkage
6. ✅ Quality Scoring
7. ✅ Schema Validation
8. ✅ Observability & PII
9. ✅ End-to-End Flow

### Running with Authentication

For full integration tests with API calls:

```bash
# 1. Start dev server
npm run dev

# 2. Get auth token from browser:
#    - Sign in at http://localhost:3000
#    - DevTools → Application → Cookies
#    - Copy 'next-auth.session-token'

# 3. Run tests
export TEST_AUTH_TOKEN='your-token-here'
npm run test:ai
```

## Documentation

- **[Testing Guide](../docs/AI_BACKLOG_BUILDER_TESTING.md)** - How to run tests
- **[Test Specification](../docs/AI_BACKLOG_BUILDER_TEST_SPEC.md)** - What each test covers
- **[Test Summary](../TEST_SUMMARY.md)** - Implementation status

## CI/CD

Tests run automatically via GitHub Actions on:
- Push to `main` or `develop`
- Pull requests
- Changes to AI-related files

See `.github/workflows/ai-tests.yml` for configuration.

## Troubleshooting

### "Tests require TEST_AUTH_TOKEN"
- Some integration tests need authentication
- They'll skip gracefully if token not provided
- Unit tests don't need authentication

### "Connection refused"
- Integration tests need dev server running
- Start with: `npm run dev`
- Or run unit tests only: `npm run test:unit`

### "Rate limit exceeded"
- Use different test user
- Or wait for rate limit reset
- Unit tests don't hit API

---

**Need help?** See [AI_BACKLOG_BUILDER_TESTING.md](../docs/AI_BACKLOG_BUILDER_TESTING.md)

