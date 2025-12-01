# Deployment Checklist

This checklist ensures a safe and successful deployment to production.

## Pre-Deployment Validation

### 1. Code Quality Checks

- [ ] **Type Checking**: Run `npm run typecheck`
  - ✅ All TypeScript errors resolved
  - ✅ No type mismatches
  - ✅ All route handlers properly typed

- [ ] **Linting**: Run `npm run lint`
  - ✅ All ESLint errors resolved
  - ✅ Code style consistent
  - ✅ No unused imports or variables

- [ ] **Build Validation**: Run `npm run validate-build`
  - ✅ TypeScript compilation passes
  - ✅ Linting passes
  - ✅ Route handlers validated
  - ✅ Exports validated

### 2. Route Handler Validation

- [ ] **Type Safety**: No `context: any` usage
  - ✅ All routes use proper TypeScript types
  - ✅ Routes with `withAuth` use `AuthContext & { params: {...} }`
  - ✅ Routes without middleware properly await `Promise<params>`

- [ ] **Parameter Extraction**: All routes use `context.params`
  - ✅ No manual `pathname.split()` usage
  - ✅ All dynamic routes properly extract params
  - ✅ Params are correctly typed

- [ ] **Error Handling**: Consistent error responses
  - ✅ All routes use `formatErrorResponse()`
  - ✅ Custom error classes used appropriately
  - ✅ Zod validation errors handled consistently

- [ ] **HTTP Methods**: Standardized methods
  - ✅ Updates use `PATCH` (not `PUT`)
  - ✅ All CRUD operations properly implemented
  - ✅ No redundant handlers

### 3. Authentication & Authorization

- [ ] **Middleware Coverage**: All routes protected
  - ✅ Web API routes use `withAuth`
  - ✅ REST API v1 routes use `withApiAuth`
  - ✅ Public routes explicitly marked

- [ ] **Authorization**: Access control verified
  - ✅ Organization access checks
  - ✅ Role-based permissions
  - ✅ Resource ownership validation

### 4. Response Formats

- [ ] **Web API**: Consistent response structure
  - ✅ Single items: `{ data: T }`
  - ✅ Lists: `{ data: T[], total: number }`
  - ✅ Errors: `formatErrorResponse()` format

- [ ] **REST API v1**: Consistent response structure
  - ✅ Single items: `{ data: T, meta?: {...} }`
  - ✅ Lists: `{ data: T[], meta: { page, total, hasMore } }`
  - ✅ Errors: Standardized error format

## Build & Test

### 5. Production Build

- [ ] **Build Test**: Run `npm run build`
  - ✅ Build completes without errors
  - ✅ No build warnings
  - ✅ All routes compile successfully
  - ✅ Static assets generated correctly

- [ ] **Type Check**: Run `npm run typecheck`
  - ✅ No TypeScript errors
  - ✅ All types resolve correctly

### 6. Integration Testing

- [ ] **Key Endpoints**: Test critical routes
  - ✅ Authentication endpoints
  - ✅ Project CRUD operations
  - ✅ Story CRUD operations
  - ✅ Sprint operations
  - ✅ User management

- [ ] **Error Scenarios**: Test error handling
  - ✅ Invalid requests return 400
  - ✅ Unauthorized requests return 401
  - ✅ Forbidden requests return 403
  - ✅ Not found returns 404
  - ✅ Server errors return 500

## Deployment Process

### 7. Staging Deployment

- [ ] **Deploy to Staging**: Push to staging environment
  - ✅ Deployment successful
  - ✅ No runtime errors in logs
  - ✅ Health check endpoint responds

- [ ] **Staging Verification**: Test in staging
  - ✅ Key features work correctly
  - ✅ API endpoints respond correctly
  - ✅ Database connections work
  - ✅ External integrations work

### 8. Production Deployment

- [ ] **Pre-Deployment**: Final checks
  - ✅ All validation steps passed
  - ✅ Staging tests successful
  - ✅ Rollback plan prepared
  - ✅ Team notified

- [ ] **Deploy to Production**: Push to production
  - ✅ Deployment successful
  - ✅ No deployment errors
  - ✅ Health check passes

- [ ] **Post-Deployment**: Verify production
  - ✅ Monitor error logs
  - ✅ Verify API endpoints
  - ✅ Check database connections
  - ✅ Monitor performance metrics

## Post-Deployment Monitoring

### 9. Monitoring & Alerts

- [ ] **Error Monitoring**: Watch for errors
  - ✅ Check error logs for first 30 minutes
  - ✅ Monitor error rates
  - ✅ Watch for new error patterns

- [ ] **Performance Monitoring**: Check performance
  - ✅ API response times normal
  - ✅ Database query times acceptable
  - ✅ No memory leaks
  - ✅ CPU usage normal

- [ ] **User Impact**: Monitor user experience
  - ✅ No user-reported issues
  - ✅ Feature functionality verified
  - ✅ No broken workflows

## Rollback Plan

If critical issues occur:

1. **Immediate Actions**:
   - [ ] Revert deployment immediately
   - [ ] Check error logs
   - [ ] Notify team

2. **Investigation**:
   - [ ] Identify root cause
   - [ ] Fix issues locally
   - [ ] Re-test fixes

3. **Re-Deployment**:
   - [ ] Fix issues
   - [ ] Re-run validation
   - [ ] Deploy fix
   - [ ] Verify fix

## Quick Reference Commands

```bash
# Pre-deployment validation
npm run typecheck
npm run lint
npm run validate-build

# Production build
npm run build

# Start production server
npm start

# Health check
curl https://your-domain.com/api/health
```

## Success Criteria

✅ All pre-deployment checks pass
✅ Production build succeeds
✅ Staging tests pass
✅ Production deployment successful
✅ No critical errors in first 30 minutes
✅ All key features working

## Notes

- Always deploy to staging first
- Monitor logs closely after deployment
- Have rollback plan ready
- Document any issues encountered
- Update this checklist based on learnings

