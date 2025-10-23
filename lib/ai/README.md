# AI Story Generation & Validation System

Comprehensive implementation of the testing checklist requirements for AI-powered story generation, validation, and epic management.

## Features

### 1. **Decomposition**
- ✅ Merges capabilities with similarity ≥ configured threshold
- ✅ Merge decisions logged with scores, provider, and model
- ✅ Total estimate computed (sum of capability estimates)
- ✅ Split recommended if total_estimate >= 8
- ✅ Soft cap warning at > 4 capabilities
- ✅ Hard cap enforced at 6 capabilities
- ✅ Second Epic flow with parentEpicId and siblingEpicIds
- ✅ RequestId generated if not provided
- ✅ Acceptance themes subset of locked enum with minItems: 1
- ✅ Schema validation with additionalProperties: false

### 2. **Story Generation**
- ✅ Stories have exactly 4-7 ACs
- ✅ No compound Then clauses
- ✅ Interactive ACs detected using verb whitelist
- ✅ is_interactive flag on each AC
- ✅ Non-UI stories pass without WCAG requirement
- ✅ Performance timing in min(4, interactive_ac_count) ACs
- ✅ No-results detection with extended keyword list
- ✅ Persistence AC added when theme present
- ✅ Technical hints in technicalHints array
- ✅ Stop sequences handled properly

### 3. **Validation & Auto-Fix**
- ✅ Split compound ACs (split-then)
- ✅ Add missing no-results AC (insert-no-results)
- ✅ Add performance timings (add-perf)
- ✅ Cross-check is_interactive flags
- ✅ Add WCAG note for UI stories (add-wcag)
- ✅ Rewrite passive voice (rewrite-passive)
- ✅ Add persistence AC (add-persistence)
- ✅ Fail validation for >7 ACs
- ✅ Quality score capped at 6.9 when manual review required
- ✅ ready_for_sprint calculation
- ✅ autofixDetails array tracked

### 4. **Idempotency**
- ✅ Request ID prevents duplicates
- ✅ Upsert with (projectId, requestId, capabilityKey)
- ✅ Epic correlation key uses stable SHA-256
- ✅ Duplicate prevention metrics tracked

### 5. **Observability**
- ✅ split.recommended_rate metric
- ✅ cap.softCapExceeded_rate metric
- ✅ total_estimate histogram
- ✅ autofix.applied_counts by type
- ✅ validation.fail_reason tracked
- ✅ merge.avg_similarity with provider/model
- ✅ stories.dup_prevented counted
- ✅ epics.dup_prevented counted
- ✅ interactive_flag_mismatch.rate tracked
- ✅ 1% prompt/output sampling with PII redaction

### 6. **Epic Build**
- ✅ Epic + child stories created with links
- ✅ Usage metrics logged
- ✅ Merge suggestions displayed
- ✅ Schema validation at API boundaries

## Services

### DecompositionService
Breaks requirements into capabilities with merge suggestions and caps enforcement.

```typescript
const response = await decompositionService.decompose({
  requirements: "User requirements text",
  projectId: "uuid",
  similarityThreshold: 0.85,
});
```

### StoryGenerationService
Generates stories from capabilities with validation.

```typescript
const story = await storyGenerationService.generateStory({
  capability: {...},
  projectId: "uuid",
  qualityThreshold: 7.0,
});
```

### ValidationService
Validates and auto-fixes acceptance criteria.

```typescript
const validation = await validationService.validateStory(
  acceptanceCriteria,
  hasUI,
  themes,
  qualityThreshold
);
```

### EpicBuildService
Builds epics with child stories from capabilities.

```typescript
const epic = await epicBuildService.buildEpic({
  epicTitle: "Epic Title",
  epicDescription: "Description",
  capabilities: [...],
  projectId: "uuid",
});
```

### CorrelationService
Handles idempotency and request correlation.

```typescript
const correlationKey = correlationService.generateCorrelationKey({
  projectId: "uuid",
  requestId: "uuid",
  capabilityKey: "cap-filter",
});
```

### PIIRedactionService
Redacts sensitive information from audit logs.

```typescript
const redacted = piiRedactionService.redact(text);
const shouldLog = piiRedactionService.shouldSample(); // 1% sampling
```

## API Endpoints

### POST /api/ai/decompose
Decompose requirements into capabilities.

**Request:**
```json
{
  "requirements": "User requirements text",
  "projectId": "uuid",
  "similarityThreshold": 0.85
}
```

### POST /api/ai/generate-from-capability
Generate story from capability.

**Request:**
```json
{
  "capability": {...},
  "projectId": "uuid",
  "qualityThreshold": 7.0
}
```

### POST /api/ai/build-epic
Build epic with child stories.

**Request:**
```json
{
  "epicTitle": "Epic Title",
  "epicDescription": "Description",
  "capabilities": [...],
  "projectId": "uuid"
}
```

## Database Schema

### Epics Table
```sql
- parent_epic_id: VARCHAR(36)
- sibling_epic_ids: JSONB
- correlation_key: VARCHAR(64) UNIQUE
- request_id: VARCHAR(36)
```

### Stories Table
```sql
- correlation_key: VARCHAR(64) UNIQUE
- request_id: VARCHAR(36)
- capability_key: VARCHAR(100)
- technical_hints: JSONB
- manual_review_required: BOOLEAN
- ready_for_sprint: BOOLEAN
```

## Acceptance Criteria Format

```typescript
{
  "given": "precondition",
  "when": "action/trigger",
  "then": "expected outcome",
  "is_interactive": true,
  "performance_target_ms": 2000,
  "themes": ["filtering", "performance"]
}
```

## Quality Scoring

- Base score: 10.0
- Deduct 2.0 per error
- Deduct 0.5 per warning
- Deduct 2.0 if < 4 ACs
- Deduct 3.0 if > 7 ACs
- Bonus 0.5 for interactive flags
- Bonus 0.5 for WCAG (UI stories)
- Cap at 6.9 if manual review required
- Clamp to [0.0, 10.0]

## Auto-Fix Types

1. **split-then**: Split compound Then clauses
2. **insert-no-results**: Add missing no-results AC
3. **add-perf**: Add performance timing
4. **add-wcag**: Add WCAG note
5. **rewrite-passive**: Rewrite passive voice
6. **add-persistence**: Add persistence AC

## Observability Metrics

All metrics tracked via `lib/observability/metrics.ts`:

- `split.recommended_rate`
- `cap.softCapExceeded_rate`
- `total_estimate` (histogram)
- `autofix.applied_counts{type}`
- `validation.fail_reason{reason}`
- `merge.avg_similarity{provider,model}`
- `stories.dup_prevented`
- `epics.dup_prevented`
- `interactive_flag_mismatch.rate`

## Testing

Run the comprehensive testing checklist:

```bash
npm test -- ai
```

## Migration

Apply database migration:

```bash
psql -f db/migrations/add-epic-linkage-and-idempotency.sql
```

