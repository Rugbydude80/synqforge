# Update Story Feature Documentation

## Overview

The **Update Story** feature allows users to edit existing stories with tier-based entitlement enforcement, comprehensive audit trails, and version tracking. This feature integrates seamlessly with SynqForge's Stripe-powered subscription tiers.

---

## Table of Contents

1. [Tier Limits](#tier-limits)
2. [API Routes](#api-routes)
3. [Database Schema](#database-schema)
4. [Frontend Integration](#frontend-integration)
5. [Usage Tracking](#usage-tracking)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Tier Limits

### Permission Table

| Tier | Updates/Month | Approval Required | Rollover | Features |
|------|---------------|-------------------|----------|----------|
| **Free/Starter** | 5 | No | No | Basic editing, version tracking |
| **Pro** | 1,000 | No | No | Unlimited fields, full audit trail |
| **Team** | Unlimited | Yes (Done/Blocked) | N/A | Shared editing, approval workflows |
| **Enterprise** | Unlimited | Configurable | N/A | Custom policies, department quotas |

### Tier-Specific Behaviors

#### Free/Starter Tier
- **Limit**: 5 updates per user per month
- **Enforcement**: Hard limit (blocks at 5)
- **Upgrade prompt**: Shows "Upgrade to Pro" when limit reached
- **Use case**: Individual developers testing the platform

#### Pro Tier
- **Limit**: 1,000 updates per user per month
- **Enforcement**: Soft warning at 90%, hard limit at 1,000
- **Upgrade prompt**: Shows "Upgrade to Team" at limit
- **Use case**: Solo developers or small teams (1-4 users)

#### Team Tier
- **Limit**: Unlimited
- **Special rule**: Requires admin/owner approval to edit Done or Blocked stories
- **Shared pool**: No per-user limits
- **Use case**: Collaborative teams (5+ users)

#### Enterprise Tier
- **Limit**: Unlimited
- **Special features**: Custom approval workflows, department allocations
- **Use case**: Large organizations with compliance requirements

---

## API Routes

### PATCH `/api/stories/[storyId]`

Update an existing story with tier enforcement and audit logging.

#### Request

```bash
curl -X PATCH https://synqforge.com/api/stories/abc-123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Story Title",
    "description": "New description",
    "acceptanceCriteria": ["AC 1", "AC 2", "AC 3"],
    "priority": "high",
    "status": "in_progress",
    "storyPoints": 5
  }'
```

#### Success Response (200 OK)

```json
{
  "id": "abc-123",
  "title": "Updated Story Title",
  "description": "New description",
  "updateVersion": 3,
  "lastUpdatedAt": "2025-01-24T10:30:00Z",
  "audit": {
    "id": "audit-xyz-789",
    "version": 3,
    "updatedAt": "2025-01-24T10:30:00Z"
  },
  "usage": {
    "used": 12,
    "limit": 1000,
    "remaining": 988,
    "percentUsed": 1,
    "unlimitedUpdates": false
  }
}
```

#### Error Response - Quota Exceeded (429 Too Many Requests)

```json
{
  "error": "Quota exceeded",
  "message": "Monthly update limit reached (5 updates/month)",
  "limit": 5,
  "used": 5,
  "remaining": 0,
  "upgradeRequired": true,
  "upgradeTier": "pro",
  "upgradeUrl": "/pricing"
}
```

#### Error Response - Approval Required (403 Forbidden)

```json
{
  "error": "Forbidden",
  "message": "Updating Done/Blocked stories requires admin approval on Team tier",
  "requiresApproval": true
}
```

#### Error Response - Validation Failed (400 Bad Request)

```json
{
  "error": "Validation failed",
  "message": "Invalid story update data",
  "details": [
    {
      "path": ["title"],
      "message": "Title is required"
    }
  ]
}
```

---

## Database Schema

### `stories` Table Updates

Added version tracking fields:

```sql
ALTER TABLE stories
ADD COLUMN last_updated_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN update_version INTEGER DEFAULT 1;
```

### `story_updates` Table

Comprehensive audit trail for all story modifications:

```sql
CREATE TABLE story_updates (
  id VARCHAR(36) PRIMARY KEY,
  story_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- JSONB diff of changes
  changes JSONB NOT NULL,

  -- Tier context
  tier_at_update TEXT NOT NULL,

  -- Version tracking
  version INTEGER NOT NULL,

  -- Update metadata
  update_type VARCHAR(50) DEFAULT 'manual',
  correlation_id VARCHAR(64),

  -- AI metadata
  ai_assisted BOOLEAN DEFAULT FALSE,
  ai_model_used VARCHAR(100),
  ai_tokens_used INTEGER,
  ai_actions_consumed DECIMAL(10, 2),

  -- Audit metadata
  ip_address VARCHAR(45),
  user_agent TEXT,

  CONSTRAINT fk_story_updates_story FOREIGN KEY (story_id)
    REFERENCES stories(id) ON DELETE CASCADE
);
```

#### Example Audit Record

```json
{
  "id": "audit-abc-123",
  "story_id": "story-xyz-789",
  "user_id": "user-456",
  "organization_id": "org-789",
  "updated_at": "2025-01-24T10:30:00Z",
  "changes": {
    "title": {
      "before": "Old Title",
      "after": "New Title"
    },
    "priority": {
      "before": "medium",
      "after": "high"
    },
    "acceptanceCriteria": {
      "before": ["AC 1", "AC 2"],
      "after": ["AC 1", "AC 2", "AC 3"]
    }
  },
  "tier_at_update": "pro",
  "version": 3,
  "update_type": "manual",
  "ai_assisted": false,
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0..."
}
```

---

## Frontend Integration

### Using the StoryEditor Component

```tsx
import { StoryEditor } from '@/components/StoryEditor';

function StoryDetailPage({ storyId }: { storyId: string }) {
  const [story, setStory] = useState<Story | null>(null);

  const handleSave = (updatedStory: Story) => {
    setStory(updatedStory);
    toast.success(`Story updated to v${updatedStory.audit.version}`);
  };

  return (
    <StoryEditor
      storyId={storyId}
      initialData={{
        title: story.title,
        description: story.description,
        acceptanceCriteria: story.acceptanceCriteria,
        priority: story.priority,
        status: story.status,
        storyType: story.storyType,
        storyPoints: story.storyPoints,
        updateVersion: story.updateVersion,
        lastUpdatedAt: story.lastUpdatedAt,
      }}
      onSave={handleSave}
      onCancel={() => router.back()}
    />
  );
}
```

### Component Features

1. **Auto-locking**: Disables form when quota exceeded
2. **Version display**: Shows current version and last update timestamp
3. **Usage indicator**: Progress bar showing monthly usage
4. **Upgrade prompts**: CTA buttons when limits reached
5. **Real-time validation**: Immediate feedback on invalid inputs

---

## Usage Tracking

### Background Job

The `story_update_tracking.ts` job runs daily to:

1. Aggregate monthly update stats per user/organization
2. Flag users approaching or exceeding limits
3. Send warning emails at 90% usage
4. Prepare data for Stripe metered billing (future)

#### Manual Trigger

```bash
# Via API
curl -X POST https://synqforge.com/api/jobs/story-update-tracking \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Via CLI
npx tsx jobs/story_update_tracking.ts
```

#### Cron Schedule

```bash
# Daily at midnight UTC
0 0 * * * node jobs/story_update_tracking.js
```

### Usage Stats API

```bash
GET /api/usage/story-updates
```

**Response:**

```json
{
  "used": 45,
  "limit": 1000,
  "remaining": 955,
  "percentUsed": 5,
  "unlimitedUpdates": false,
  "period": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-01-31T23:59:59Z"
  }
}
```

---

## Testing

### Local Testing

```bash
# Run unit tests
npm test __tests__/update-story.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode for development
npm test -- --watch
```

### Manual Testing Workflow

#### 1. Test Free Tier Limit

```bash
# Create 5 updates (should succeed)
for i in {1..5}; do
  curl -X PATCH https://localhost:3000/api/stories/test-story-1 \
    -H "Authorization: Bearer FREE_USER_TOKEN" \
    -d "{\"title\": \"Update $i\"}"
done

# Try 6th update (should fail with 429)
curl -X PATCH https://localhost:3000/api/stories/test-story-1 \
  -H "Authorization: Bearer FREE_USER_TOKEN" \
  -d '{"title": "Update 6"}' \
  -v
# Expected: HTTP 429 with upgrade prompt
```

#### 2. Test Pro Tier Limit

```bash
# Mock 999 updates, then try 1000th and 1001st
# (Use database seeding script)
npm run seed:story-updates -- --userId=pro-user --count=999

# Try 1000th update (should succeed with warning)
curl -X PATCH https://localhost:3000/api/stories/test-story-2 \
  -H "Authorization: Bearer PRO_USER_TOKEN" \
  -d '{"title": "Update 1000"}'

# Try 1001st update (should fail)
curl -X PATCH https://localhost:3000/api/stories/test-story-2 \
  -H "Authorization: Bearer PRO_USER_TOKEN" \
  -d '{"title": "Update 1001"}' \
  -v
# Expected: HTTP 429
```

#### 3. Test Team Tier Approval

```bash
# Update a Done story as member (should fail)
curl -X PATCH https://localhost:3000/api/stories/done-story-1 \
  -H "Authorization: Bearer TEAM_MEMBER_TOKEN" \
  -d '{"title": "Try to update Done story"}' \
  -v
# Expected: HTTP 403 with requiresApproval: true

# Update same story as admin (should succeed)
curl -X PATCH https://localhost:3000/api/stories/done-story-1 \
  -H "Authorization: Bearer TEAM_ADMIN_TOKEN" \
  -d '{"title": "Admin can update Done story"}'
# Expected: HTTP 200
```

#### 4. Test Audit Trail

```bash
# Get story update history
curl https://localhost:3000/api/stories/test-story-1/history \
  -H "Authorization: Bearer USER_TOKEN"

# Expected response:
# [
#   {
#     "version": 3,
#     "updatedAt": "2025-01-24T10:30:00Z",
#     "updatedBy": "user-123",
#     "changes": {...}
#   },
#   ...
# ]
```

---

## Deployment

### Pre-Deployment Checklist

- [ ] **Database migration applied**
  ```bash
  psql $DATABASE_URL < lib/db/migrations/add_story_update_tracking.sql
  ```

- [ ] **Stripe metadata updated**
  ```bash
  ./scripts/update-stripe-metadata.sh live
  ```

- [ ] **Metadata validation passed**
  ```bash
  ./scripts/validate-story-update-metadata.sh live
  ```

- [ ] **Environment variables set**
  ```bash
  STRIPE_SECRET_KEY_LIVE=sk_live_...
  STRIPE_STARTER_PRODUCT_ID_LIVE=prod_...
  STRIPE_PRO_PRODUCT_ID_LIVE=prod_...
  STRIPE_TEAM_PRODUCT_ID_LIVE=prod_...
  STRIPE_ENTERPRISE_PRODUCT_ID_LIVE=prod_...
  ```

- [ ] **Cron job configured**
  ```bash
  # Add to crontab or serverless cron
  0 0 * * * /usr/bin/node /path/to/jobs/story_update_tracking.js
  ```

- [ ] **Tests passing**
  ```bash
  npm test
  ```

### Deployment Steps

```bash
# 1. Apply database migration
npm run migrate:production

# 2. Update Stripe products
./scripts/update-stripe-metadata.sh live

# 3. Validate Stripe metadata
./scripts/validate-story-update-metadata.sh live

# 4. Deploy application
git add .
git commit -m "feat: Add Update Story feature with tier enforcement"
git push origin main

# 5. Run database migration on production
# (via Vercel, Railway, or direct psql)

# 6. Verify deployment
curl https://synqforge.com/api/health
```

---

## Troubleshooting

### Common Issues

#### Issue: "Organization not found" error

**Cause**: User's organization record missing or corrupted

**Solution**:
```sql
-- Check user's organization
SELECT u.id, u.email, u.organization_id, o.name
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.id = 'user-id';

-- Fix orphaned user
UPDATE users
SET organization_id = 'valid-org-id'
WHERE id = 'user-id';
```

#### Issue: Tier limit not enforced

**Cause**: Stripe metadata not synced or tier mismatch

**Solution**:
```bash
# Re-sync Stripe metadata
./scripts/update-stripe-metadata.sh live

# Verify organization tier
psql $DATABASE_URL -c "SELECT id, name, subscription_tier FROM organizations WHERE id = 'org-id';"
```

#### Issue: Audit records not created

**Cause**: Database transaction failure or missing fields

**Solution**:
```javascript
// Check logs for SQL errors
console.error('Audit insert error:', error);

// Verify storyUpdates table exists
psql $DATABASE_URL -c "\d story_updates"
```

#### Issue: Version conflicts

**Cause**: Concurrent updates from multiple users

**Solution**: Implement optimistic locking
```typescript
// In update handler
if (clientVersion < currentVersion) {
  return NextResponse.json(
    { error: 'Version conflict', currentVersion },
    { status: 409 }
  );
}
```

---

## Future Enhancements

### Planned Features

1. **Real-time Collaboration** (Team tier)
   - WebSocket-based concurrent editing
   - Live cursor positions
   - Conflict-free CRDT synchronization

2. **Metered Billing**
   - Sync usage to Stripe for overage charges
   - Pay-as-you-go for Pro tier overages

3. **Approval Workflows** (Enterprise)
   - Multi-stage approval chains
   - Configurable approval rules
   - Slack/Teams integration for notifications

4. **Advanced Audit**
   - Compliance exports (GDPR, SOC2)
   - Immutable audit logs
   - Retention policies per organization

---

## Support

For questions or issues:

- **Documentation**: https://docs.synqforge.com
- **Support Email**: support@synqforge.com
- **GitHub Issues**: https://github.com/synqforge/synqforge/issues
- **Community Forum**: https://forum.synqforge.com

---

## License

© 2025 SynqForge. All rights reserved.
