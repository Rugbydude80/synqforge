# Story Split Feature

## Overview

The Story Split feature allows users to decompose large stories into smaller, independently valuable stories following INVEST principles and SPIDR heuristics. The feature includes comprehensive validation, guardrails, and traceability.

## Architecture

### Database Schema

```sql
-- stories table additions
ALTER TABLE stories
  ADD COLUMN parent_id VARCHAR(255) REFERENCES stories(id),
  ADD COLUMN split_from_id VARCHAR(255) REFERENCES stories(id),
  ADD COLUMN is_epic BOOLEAN DEFAULT FALSE;

-- story_links table for relationships
CREATE TABLE story_links (
  id VARCHAR(255) PRIMARY KEY,
  story_id VARCHAR(255) NOT NULL REFERENCES stories(id),
  related_story_id VARCHAR(255) NOT NULL REFERENCES stories(id),
  relation VARCHAR(50) CHECK (relation IN ('split_child', 'split_parent', 'depends_on'))
);

-- story_split_audit for history tracking
CREATE TABLE story_split_audit (
  id VARCHAR(255) PRIMARY KEY,
  parent_story_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  converted_to_epic BOOLEAN NOT NULL,
  child_count INTEGER NOT NULL,
  invest_rationale JSONB,
  spidr_strategy JSONB
);
```

### Backend Services

1. **StorySplitAnalysisService** (`lib/services/story-split-analysis.service.ts`)
   - Analyzes stories for INVEST compliance (Valuable, Independent, Small, Testable, Estimable)
   - Detects SPIDR opportunities (Spike, Paths, Interfaces, Data, Rules)
   - Returns recommendations on whether splitting is beneficial

2. **StorySplitValidationService** (`lib/services/story-split-validation.service.ts`)
   - Validates child stories against INVEST criteria
   - Checks for coupling between children
   - Ensures user-visible value

3. **StorySplitService** (`lib/services/story-split.service.ts`)
   - Executes transactional story splitting
   - Creates child stories with proper linkage
   - Optionally converts parent to epic
   - Maintains audit trail

### API Routes

- `GET /api/stories/:id/split-analysis` - Get INVEST/SPIDR analysis
- `POST /api/stories/:id/split` - Execute story split with validation

### Frontend Components

1. **SplitStoryButton** - Feature-flagged action button in story header
2. **SplitStoryModal** - Main modal with dual-panel layout:
   - Left: Analysis panel showing INVEST score and SPIDR suggestions
   - Right: Children editor with dynamic list of child stories
3. **AnalysisPanel** - Displays INVEST metrics and splitting recommendations
4. **ChildrenEditor** - Manages list of child stories
5. **ChildRowEditor** - Edits individual child stories with inline validation

## INVEST Principles

Each child story must meet:

- **Valuable**: Provides user-visible outcome with clear acceptance criteria
- **Independent**: No tight coupling with other children
- **Small**: Story points ≤ 5, fits in one sprint
- **Testable**: Clear, unambiguous acceptance criteria (minimum 2)
- **Estimable**: Has story points estimate

## SPIDR Heuristics

The system detects opportunities to split by:

- **Spike**: Research/investigation work that reduces uncertainty
- **Paths**: Alternate workflows or user journeys
- **Interfaces**: Progressive UI/API implementation
- **Data**: Different data formats or subsets
- **Rules**: Starting with relaxed validation, adding strictness later

## Guardrails

The feature blocks splitting when:

1. Story is already optimal (Small + Valuable + Testable)
2. Any child fails Valuable or Testable checks
3. Children lack proper acceptance criteria (< 2)
4. Children don't provide user-visible value
5. Persona-goal statements are missing or too short

## Feature Flag

The feature is controlled by the `stories.split_button.enabled` flag.

**Enable in production:**
```bash
# Set in Vercel environment variables
NEXT_PUBLIC_ENABLE_STORY_SPLIT=true
```

**Enable in development:**
- Automatically enabled when `NODE_ENV=development`

## Usage

1. Navigate to a story detail page
2. Hover over the story title to reveal actions
3. Click "Split story" button
4. Review INVEST analysis and SPIDR suggestions
5. Add child stories (or use "Suggest splits" when available)
6. Fill in required fields for each child:
   - Title
   - Persona-Goal statement
   - Description
   - Acceptance Criteria (minimum 2)
   - Story Points (1-5)
7. Optionally check "Convert parent to epic"
8. Click "Create N stories" to execute

## Validation

Each child story is validated in real-time:

- ✓ Green checkmarks show passed INVEST criteria (V, I, S, T)
- ❌ Red errors block submission
- ⚠️ Yellow warnings alert to potential issues

## Telemetry

The feature emits the following metrics:

- `story_split_opened` - Modal opened
- `story_split_suggested` - Auto-suggestions generated
- `story_split_validated` - All children validated successfully
- `story_split_committed` - Split executed
- `story_split_blocked` - Split blocked due to validation

## Migration

Run the migration to add required database tables and columns:

```bash
# Production migration
psql $DATABASE_URL < db/migrations/add-story-splitting.sql
```

## Internationalization

All user-facing strings use the `t()` helper from `lib/i18n/index.ts`. 

To add translations:
1. Add key-value pairs to the `translations` object in `lib/i18n/index.ts`
2. Use `t('key')` in components

## Accessibility

- Keyboard navigation (Enter to submit, Escape to close)
- Focus management (trapped in modal)
- ARIA labels and roles
- Screen reader announcements
- Visible focus indicators

## Future Enhancements

- AI-powered "Suggest splits" using SPIDR patterns
- Batch validation UI improvements
- Undo/rollback functionality
- Split history visualization
- Integration with sprint planning

## Testing

While comprehensive tests were not included in this initial implementation, the following test coverage is recommended:

- Unit tests for analysis and validation services
- API integration tests for split routes
- Component tests for modal and editors
- E2E tests for full split workflow

## Support

For issues or questions, refer to:
- Code: `components/story-split/` and `lib/services/story-split-*.service.ts`
- API: `app/api/stories/[storyId]/split*/route.ts`
- Database: `db/migrations/add-story-splitting.sql`

