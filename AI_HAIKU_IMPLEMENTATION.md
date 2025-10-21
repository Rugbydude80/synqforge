# Claude 4.5 Haiku Implementation Guide

## Overview

SynqForge now uses **Claude 4.5 Haiku** exclusively for all AI features, with comprehensive cost controls and tier-aware token budgets. This implementation prevents escalation to more expensive models while providing excellent results for our use cases.

## Architecture

### 1. **Prompt System** (`lib/ai/prompts.ts`)

Three specialized prompts optimized for Haiku:

- **System Prompt** - General AI tasks
- **Story Prompt** - Generate perfect user stories
- **Decomposer Prompt** - Break documents into epics & stories
- **Velocity Prompt** - Sprint planning and forecasting

Each prompt is tier-aware and enforces strict token budgets.

### 2. **Usage Enforcement** (`lib/ai/usage-enforcement.ts`)

#### Token Budgets (max_output_tokens)
| Tier       | Default | Max   |
|------------|---------|-------|
| Free       | 400     | 600   |
| Solo       | 600     | 800   |
| Team       | 1,000   | 1,400 |
| Pro        | 1,400   | 2,000 |
| Business   | 1,400   | 2,000 |
| Enterprise | 2,000   | 4,000 |

#### Monthly Token Limits
| Tier       | Soft Cap    | Hard Cap     |
|------------|-------------|--------------|
| Free       | 20K         | 30K          |
| Solo       | 300K        | 500K         |
| Team       | 2M          | 3M           |
| Pro        | 10M         | 15M          |
| Business   | 10M         | 15M          |
| Enterprise | 50M         | 100M         |

#### Enforcement Rules

1. **Soft Cap** - Throttle `max_output_tokens` to 50% of remaining quota
2. **Hard Cap** - Block all AI requests until monthly reset
3. **Rate Limits** - Per-user RPM/TPM limits based on tier
4. **Abuse Detection** - Block >3 identical prompts in 10 minutes

### 3. **Haiku Service** (`lib/ai/haiku-service.ts`)

Unified service with four methods:

```typescript
// General completion
HaikuService.generateCompletion({
  organizationId: string,
  userId: string,
  tier: SubscriptionTier,
  userRequest: string,
  taskComplexity?: 'simple' | 'medium' | 'complex'
})

// Story generation
HaikuService.generateStory({ ... })

// Document decomposition
HaikuService.decomposeDocument({
  ...,
  docTitle: string,
  docSize: number,
  priorities?: string,
  nonGoals?: string
})

// Velocity planning
HaikuService.analyzeVelocity({
  ...,
  pastSprints: [...],
  backlog: [...],
  sprintLengthDays: number,
  numFutureSprints: number
})
```

## Usage

### Example: Generate a User Story

```typescript
import { HaikuService } from '@/lib/ai/haiku-service'

const response = await HaikuService.generateStory({
  organizationId: org.id,
  userId: user.id,
  tier: 'team',
  userRequest: 'Create a login page with email and password',
  taskComplexity: 'medium'
})

console.log(response.content) // The generated story
console.log(response.usage)   // Token usage stats
console.log(response.throttled) // Whether response was throttled
```

### Example: API Route

```typescript
// app/api/ai/my-feature/route.ts
import { HaikuService } from '@/lib/ai/haiku-service'

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()

  const response = await HaikuService.generateCompletion({
    organizationId: org.id,
    userId: user.id,
    tier: org.plan,
    userRequest: prompt,
  })

  return NextResponse.json({
    result: response.content,
    usage: response.usage
  })
}
```

## Database Schema

The implementation uses your existing Neon database with these tables:

### `ai_usage_metering`
```sql
CREATE TABLE ai_usage_metering (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  generation_type TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  cache_hit BOOLEAN DEFAULT FALSE,
  prompt_hash VARCHAR(64),
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usage_org_month ON ai_usage_metering(organization_id, timestamp);
CREATE INDEX idx_usage_prompt_hash ON ai_usage_metering(prompt_hash, timestamp);
```

## Monitoring & Alerts

The system tracks and can alert on:

- **Usage spikes** - >3σ above normal
- **Duplicate prompts** - >60% identical in 10 minutes
- **Cache bypass** - >40% cache misses (when caching is available)
- **Soft limit approach** - Organizations at >80% soft cap
- **Hard limit** - Organizations that hit hard cap

## UI Components

### Usage Dashboard

```tsx
import { UsageDashboard } from '@/components/ai/UsageDashboard'

export default function SettingsPage() {
  return (
    <div>
      <h1>AI Usage</h1>
      <UsageDashboard />
    </div>
  )
}
```

Shows:
- Current usage vs limits
- Token consumption chart
- API call stats
- Cache hit rate
- Warning alerts at 80%/95%/100%

## Cost Optimization

### Why Claude 4.5 Haiku?

1. **10x cheaper** than Sonnet/Opus (~$0.25/MTok vs $3-15/MTok)
2. **Faster** - Sub-second responses for most tasks
3. **Good enough** - 90%+ quality for our structured outputs
4. **No escalation** - Hard lock prevents accidental expensive calls

### Prompt Engineering

All prompts:
- Enforce brevity ("short sentences", "bullets over prose")
- Set explicit token limits
- Request structured output
- Use UK English (more concise than US)
- Include budget mode for large responses

## Testing

```bash
# Test story generation
curl -X POST http://localhost:3000/api/ai/generate-story-haiku \
  -H "Content-Type: application/json" \
  -d '{"prompt": "User login page", "complexity": "medium"}'

# Check usage
curl http://localhost:3000/api/ai/generate-story-haiku
```

## Migration from Old System

1. Update existing AI endpoints to use `HaikuService`
2. Remove any Sonnet/Opus model references
3. Add usage dashboard to settings
4. Run database migrations (already done)
5. Monitor usage for first week

## Future Enhancements

- [ ] Prompt caching (when Haiku supports it)
- [ ] Batch processing for bulk operations
- [ ] A/B test prompts for quality/cost
- [ ] Fine-tuning for domain-specific terms
- [ ] Streaming responses for long outputs

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...  # Required
```

## Support

For issues or questions:
- Check logs in `ai_usage_metering` table
- Review usage stats in dashboard
- Contact: support@synqforge.com

---

**Last Updated**: October 21, 2025
**Model**: Claude 4.5 Haiku (claude-3-5-haiku-20241022)
**Status**: Production Ready ✅
