# Error Handling & UX Gaps - Quick Reference

## Critical Issues (Must Fix)

### 1. Team Page (/app/team/page.tsx)
- **Line 96-115**: Uses `alert()` instead of toast
- **Line 69-94**: No error state display for fetch failures
- Fix: Add error state, use toast, show error UI

### 2. Billing Page (/app/settings/billing/page.tsx)
- **Line 42-118**: Silent API failures (no error state)
- **Impact**: Users can't see subscription info
- Fix: Add error state and error UI display

### 3. Metrics Endpoint (/app/api/metrics/route.ts)
- **Line 8-21**: NO try-catch block
- Fix: Wrap in try-catch

### 4. Dashboard (/app/dashboard/page.tsx)
- **Line 100-114**: Project activation no feedback
- **Impact**: Users don't know action result
- Fix: Add toast success/error

## High Priority (This Sprint)

### AI Generate Page (/app/ai-generate/page.tsx)
- Line 64-82: Projects error only shows toast, button still enabled
- Add: `projectsError` state, disable UI when error

### Stories Page (/app/stories/page.tsx)
- Line 124-147: Partial epic load failures hidden
- Add: Accumulate errors, show warnings

### Debug Page (/app/debug/page.tsx)
- Line 10-20: Promise chain with no error state
- Add: Error state display

## Medium Priority

### All List Pages
- Team page: No empty state for members
- Dashboard: No empty state for activities
- Add: Empty states with CTA

### Form Validation
- Create Project Modal: Generic error box
- Add: Per-field error display

## Good Examples (Follow This Pattern)

### Projects Page (/app/projects/page.tsx)
✓ Has error state (line 126-140)
✓ Has loading state (line 105-124)
✓ Has empty state (line 197-214)

### Story Detail (/components/story-detail-client.tsx)
✓ Has optimistic update (line 107-125)
✓ Has rollback on error
✓ Has toast feedback

### Create Project Modal (/components/create-project-modal.tsx)
✓ Has error state (line 175-179)
✓ Has loading state (line 76-106)
✓ Has toast feedback (line 92, 104)

## Pattern Template

```typescript
// State
const [data, setData] = useState(null)
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

// Fetch
const fetch = async () => {
  try {
    setLoading(true)
    setError(null)
    setData(await api.get())
  } catch (err: any) {
    setError(err.message)
    toast.error(err.message)
  } finally {
    setLoading(false)
  }
}

// Render
if (loading) return <Skeleton />
if (error) return <ErrorState message={error} onRetry={fetch} />
if (!data?.length) return <EmptyState />
return <List data={data} />
```

## Test Checklist

- [ ] Simulate network failure - see error UI
- [ ] Simulate API error - see error message & toast
- [ ] Empty data - see empty state with CTA
- [ ] Loading - see skeleton/spinner
- [ ] Success - see toast confirmation
- [ ] No silent failures
