# SynqForge Product Functionality & User Journeys Dossier

**Generated:** 2025-01-24  
**Purpose:** Evidence-backed product documentation for LinkedIn launch strategy  
**Scope:** Exact functionality, user journeys, plan gating, and technical implementation

---

## 1. Overview

SynqForge is an AI-powered user story management platform that transforms requirements into INVEST-compliant user stories. The platform supports five subscription tiers (Starter, Core, Pro, Team, Enterprise) with AI action metering, semantic search, custom document templates, and export capabilities. Users can generate stories from text or documents, split stories using AI, manage epics, and export to multiple formats.

**Evidence:**
- Plan definitions: `config/plans.json:1-333`
- Core product description: `app/pricing/page.tsx:198-200`
- Database schema: `lib/db/schema.ts:96-148`

---

## 2. Feature Inventory

### 2.1 AI Story Generation

**Purpose:** Generate INVEST-compliant user stories from requirements text or documents.

**Entry Points:**
- `/ai-generate` page (`app/ai-generate/page.tsx:49-647`)
- API: `POST /api/ai/generate-stories` (`app/api/ai/generate-stories/route.ts:21-432`)
- API: `POST /api/ai/generate-single-story` (`app/api/ai/generate-single-story/route.ts:28-233`)

**Inputs:** Requirements text, project ID, optional epic ID, prompt template, custom template ID, context level  
**Outputs:** Generated story objects with title, description, acceptance criteria, story points, priority

**Plan Gating:**
- Starter: Single story generation (INVEST gating) — `config/plans.json:28-34`
- Core+: Multiple story generation — `config/plans.json:61-69`
- Pro+: Smart Context (semantic search) — `config/plans.json:98-106`
- Team+: Deep Reasoning mode — `config/plans.json:138-146`

**Constraints:**
- Starter: 25 AI actions/month — `config/plans.json:21`
- Core: 400 AI actions/month — `config/plans.json:51`
- Pro: 800 AI actions/month — `config/plans.json:86`
- Team: 10,000 base + 1,000 per seat — `config/plans.json:123-124`
- Enterprise: Custom — `config/plans.json:162-163`

**Evidence:**
- Generation service: `lib/ai/story-generation.service.ts:53-138`
- Prompt templates: `lib/ai/prompts.ts:78-110`
- Context levels: `lib/types/context.types.ts:5-66`

---

### 2.2 Smart Context (Semantic Search)

**Purpose:** AI automatically finds similar stories within an epic to improve generation quality by 75%.

**Entry Points:**
- Story generation with `contextLevel: COMPREHENSIVE` (`app/api/ai/generate-stories/route.ts:156-208`)
- Context selector component (`components/story-generation/ContextSelector.tsx:9-72`)

**Inputs:** Query text, epic ID, similarity threshold (default 0.7), limit (default 5)  
**Outputs:** Top 5 similar stories with similarity scores

**Plan Gating:**
- Pro+ only — `config/plans.json:102`
- Access control: `lib/types/context.types.ts:68-88`

**Constraints:**
- Minimum similarity: 0.7 — `lib/services/embeddings.service.ts:42`
- Max results: 5 — `lib/services/embeddings.service.ts:43`
- Embedding model: `openai/text-embedding-3-small` — `lib/services/embeddings.service.ts:41`

**Evidence:**
- Embeddings service: `lib/services/embeddings.service.ts:26-242`
- Semantic search implementation: `app/api/ai/generate-stories/route.ts:168-197`

---

### 2.3 Deep Reasoning Mode

**Purpose:** Enhanced AI analysis for complex, compliance, and security stories (Team+).

**Entry Points:**
- Story generation with `contextLevel: COMPREHENSIVE_THINKING` (`lib/types/context.types.ts:9`)
- Context selector: "Comprehensive + Thinking" option (`components/story-generation/ContextSelector.tsx:66-72`)

**Inputs:** Requirements, epic context, semantic search results  
**Outputs:** Stories with enhanced edge case analysis and compliance focus

**Plan Gating:**
- Team+ only — `config/plans.json:142`
- Access control: `lib/types/context.types.ts:76-87`

**Constraints:**
- Cost: 3 AI actions per generation — `lib/types/context.types.ts:57`
- Token estimate: 6000 — `lib/types/context.types.ts:58`

**Evidence:**
- Context config: `lib/types/context.types.ts:55-65`
- Feature description: `config/plans.json:142`

---

### 2.4 Story Splitting

**Purpose:** Split large stories into smaller INVEST-compliant child stories using AI.

**Entry Points:**
- API: `POST /api/stories/[storyId]/split` (`app/api/stories/[storyId]/split/route.ts:26-176`)
- API: `POST /api/stories/[storyId]/split-enhanced` (`app/api/stories/[storyId]/split-enhanced/route.ts:16-131`)
- API: `GET /api/stories/[storyId]/split-analysis` (`app/api/stories/[storyId]/split-analysis/route.ts:7-102`)

**Inputs:** Parent story ID, split strategy (INVEST/SPIDR), optional convert parent to epic  
**Outputs:** Child stories with 100% acceptance criteria coverage

**Plan Gating:**
- Core+: Up to 3 children — `config/plans.json:66`
- Team+: Up to 7 children — `lib/constants.ts:417`
- Enterprise: Unlimited — `config/plans.json:171`

**Constraints:**
- Core: Max 3 children per split — `config/plans.json:58`
- Team: Max 7 children — `lib/constants.ts:417`
- 100% AC coverage required (unless super admin) — `app/api/stories/[storyId]/split/route.ts:84-102`
- Cost: 1 AI action per split — `config/plans.json:265`

**Evidence:**
- Split service: `lib/services/story-split.service.ts:186-289`
- Validation service: `lib/services/story-split-validation.service.ts:40-379`
- Coverage enforcement: `app/api/stories/[storyId]/split/route.ts:76-102`

---

### 2.5 Custom Document Templates

**Purpose:** Upload and use custom structured story templates for consistent formatting.

**Entry Points:**
- API: `POST /api/custom-templates` (`app/api/custom-templates/route.ts:24-70`)
- API: `GET /api/custom-templates` (`app/api/custom-templates/route.ts:50-70`)
- API: `POST /api/custom-templates/[templateId]/preview` (`app/api/custom-templates/preview/route.ts`)
- Template selector component (`components/ai/custom-template-manager.tsx`)

**Inputs:** Template file (DOCX/MD), template name, description, organization ID  
**Outputs:** Template ID, parsed format structure

**Plan Gating:**
- Core+ — `config/plans.json:68`
- Pro+: Shared templates — `config/plans.json:94`
- Team+: Team template library — `config/plans.json:143`

**Constraints:**
- File size: 10MB max — `app/api/documents/upload/route.ts:6`
- Allowed types: PDF, DOCX, TXT, MD — `app/api/documents/upload/route.ts:7`
- Pro+ required for custom templates in generation — `app/api/ai/generate-stories/route.ts:229-239`

**Evidence:**
- Template repository: `lib/repositories/story-templates.repository.ts:40-776`
- Custom template parser: `lib/services/custom-template-parser.service.ts`
- Upload endpoint: `app/api/documents/upload/route.ts:9-80`

---

### 2.6 Document Upload & Analysis

**Purpose:** Upload documents (PDF, DOCX, TXT, MD) and extract requirements using AI.

**Entry Points:**
- API: `POST /api/documents/upload` (`app/api/documents/upload/route.ts:9-80`)
- API: `POST /api/ai/analyze-document` (`app/api/ai/analyze-document/route.ts:12-199`)
- API: `POST /api/projects/[projectId]/files/process-and-analyze` (`app/api/projects/[projectId]/files/process-and-analyze/route.ts:14-124`)

**Inputs:** File (PDF/DOCX/TXT/MD), project ID, optional create stories flag  
**Outputs:** Extracted text, analysis summary, suggested stories/epics

**Plan Gating:**
- All tiers (with action limits)  
**Constraints:**
- File size: 10MB max — `app/api/documents/upload/route.ts:29`
- Cost: 2 AI actions per analysis — `config/plans.json:290-293`

**Evidence:**
- File processor: `lib/services/file-processor.service.ts:13-160`
- Document analysis: `app/api/ai/analyze-document/route.ts:12-199`

---

### 2.7 Export Functionality

**Purpose:** Export projects and stories to Word, Excel, PDF, CSV, Jira formats.

**Entry Points:**
- API: `GET /api/projects/[projectId]/export?format=word|excel|pdf` (`app/api/projects/[projectId]/export/route.ts:17-97`)
- API: `GET /api/stories/export?format=word|excel|pdf` (`app/api/stories/export/route.ts:19-157`)
- Export button component (`components/export-button.tsx:16-96`)

**Inputs:** Project ID or story IDs, format (word/excel/pdf/csv/jira)  
**Outputs:** File download (DOCX, XLSX, PDF, CSV, Jira JSON)

**Plan Gating:**
- Starter: Word/Excel only — `config/plans.json:33`
- Core+: All formats — `app/api/projects/[projectId]/export/route.ts:22`
- Pro+: Jira/CSV export — `config/plans.json:105` (Note: Jira sync stub exists, full integration Q2 2026 — `lib/services/integrationsService.ts:197-203`)

**Constraints:**
- Core+ required for export — `app/api/projects/[projectId]/export/route.ts:22`
- Jira export: Pro+ (currently stub) — `lib/middleware/subscription-guard-edge.ts:44`

**Evidence:**
- Export utilities: `lib/export/exporters.ts:1-356`
- Project export: `app/api/projects/[projectId]/export/route.ts:17-97`
- Story export: `app/api/stories/export/route.ts:19-157`

---

### 2.8 AI Actions Metering & Rollover

**Purpose:** Track AI action usage and apply rollover for unused actions.

**Entry Points:**
- API: `GET /api/billing/ai-actions-usage` (`app/api/billing/ai-actions-usage/route.ts`)
- Metering service (`lib/services/ai-actions-metering.service.ts:41-378`)

**Inputs:** Organization ID, user ID, billing period  
**Outputs:** Actions used, allowance, rollover amount, breakdown by operation type

**Plan Gating:**
- Core+: 20% rollover — `config/plans.json:52,87`
- Starter: No rollover — `config/plans.json:22`

**Constraints:**
- Rollover percentage: 20% (Core/Pro/Team) — `config/plans.json:52,87,125`
- Enterprise: Policy-based — `config/plans.json:164`
- Billing period: Monthly — `lib/services/ai-actions-metering.service.ts:45-50`

**Evidence:**
- Metering service: `lib/services/ai-actions-metering.service.ts:41-378`
- Rollover calculation: `lib/services/ai-actions-metering.service.ts:97-140`
- Plan definitions: `config/plans.json:21-22,51-52,86-87,123-125,162-164`

---

### 2.9 Team Pooling (Shared AI Actions)

**Purpose:** Shared AI action pool across team members with soft per-user caps.

**Entry Points:**
- Metering service calculates pooled allowance (`lib/services/ai-actions-metering.service.ts:69-79`)
- Usage tracking: `app/api/billing/ai-actions-usage/route.ts`

**Inputs:** Organization ID, seat count  
**Outputs:** Total pool = base + (per-seat × seats)

**Plan Gating:**
- Team+ only — `config/plans.json:126`
- Enterprise: Custom pools — `config/plans.json:176`

**Constraints:**
- Team: 10,000 base + 1,000 per seat — `config/plans.json:123-124`
- Soft cap: 2,000 actions/user — `lib/constants.ts:416`
- Example: 5-person team = 15,000 actions — `config/plans.json:309`

**Evidence:**
- Pooling calculation: `lib/services/ai-actions-metering.service.ts:69-79`
- Plan config: `config/plans.json:123-126`
- Constants: `lib/constants.ts:412-416`

---

### 2.10 Epic Management

**Purpose:** Create and manage epics containing multiple user stories.

**Entry Points:**
- API: `POST /api/ai/build-epic` (`app/api/ai/build-epic/route.ts`)
- API: `POST /api/ai/generate-epic` (`app/api/ai/generate-epic/route.ts`)
- API: `GET /api/epics` (`app/api/epics/route.ts`)
- API: `GET /api/epics/[epicId]` (`app/api/epics/[epicId]/route.ts`)

**Inputs:** Requirements, project ID, capabilities list  
**Outputs:** Epic with child stories

**Plan Gating:**
- All tiers (with action limits)  
**Constraints:**
- Cost: 1 AI action per epic — `config/plans.json:285-288`

**Evidence:**
- Epic build service: `lib/ai/epic-build.service.ts:17-149`
- Epic routes: `app/api/epics/route.ts`

---

## 3. User Journeys

### 3.1 Sign-Up → Plan Selection → Onboarding

**Step 1: Visit Pricing Page**
- Route: `/pricing` (`app/pricing/page.tsx:30-348`)
- UI: Plan cards with pricing, features, currency selector, billing interval toggle
- Actions: User selects plan, clicks "Start Free Trial" or "Continue with Starter Plan"
- Evidence: `app/pricing/page.tsx:115-177`

**Step 2: Sign-Up Flow**
- Route: `/auth/signup` (`app/auth/signup/page.tsx:60-421`)
- UI: Two-step form (plan selection → account creation)
- Actions: User enters name, email, password, confirms password
- Result: Account created, organization created with `starter` tier initially
- Evidence: `app/api/auth/signup/route.ts:41-349`

**Step 3: Paid Plan Checkout (if applicable)**
- Route: Stripe checkout (redirect)
- Actions: User completes payment
- Result: Stripe webhook upgrades organization to paid tier
- Evidence: `app/api/billing/create-checkout/route.ts:152-169`

**Step 4: Onboarding**
- Route: `/dashboard` (after sign-in)
- UI: Dashboard with project creation prompt
- Actions: User creates first project
- Evidence: Dashboard component (referenced in routing)

---

### 3.2 Paste Notes → AI Story Authoring → Refinement → Split Stories

**Step 1: Navigate to AI Generate Page**
- Route: `/ai-generate` (`app/ai-generate/page.tsx:49-647`)
- UI: Project selector, input mode toggle (description/document), textarea or file upload
- Actions: User selects project, pastes requirements text
- Evidence: `app/ai-generate/page.tsx:54-95`

**Step 2: Select Context Level (Pro+)**
- UI: Context selector dropdown (`components/story-generation/ContextSelector.tsx:9-72`)
- Options: Minimal (Starter), Standard (Core+), Comprehensive (Pro+), Comprehensive + Thinking (Team+)
- Actions: User selects context level
- Evidence: `lib/types/context.types.ts:27-66`

**Step 3: Generate Stories**
- API: `POST /api/ai/generate-stories` (`app/api/ai/generate-stories/route.ts:21-432`)
- Actions: System validates tier, checks AI action allowance, generates stories with semantic context (if Pro+)
- Result: Generated stories displayed in UI
- Evidence: `app/api/ai/generate-stories/route.ts:21-432`

**Step 4: Review & Refine**
- UI: Story cards with edit buttons
- Actions: User edits story title, description, acceptance criteria
- Result: Story saved to project
- Evidence: Story form modal (`components/story-form-modal.tsx:34-540`)

**Step 5: Split Story (if too large)**
- Route: Story detail page → Split button
- API: `GET /api/stories/[storyId]/split-analysis` (`app/api/stories/[storyId]/split-analysis/route.ts:7-102`)
- UI: Split suggestions with INVEST/SPIDR analysis
- Actions: User reviews suggestions, confirms split
- API: `POST /api/stories/[storyId]/split` (`app/api/stories/[storyId]/split/route.ts:26-176`)
- Result: Parent story converted to epic (optional), child stories created with 100% AC coverage
- Evidence: `lib/services/story-split.service.ts:221-289`

---

### 3.3 Smart Context Usage Within Epic (Pro+)

**Step 1: Create Epic**
- API: `POST /api/ai/build-epic` (`app/api/ai/build-epic/route.ts`)
- Actions: User provides epic requirements, system creates epic
- Evidence: `lib/ai/epic-build.service.ts:21-148`

**Step 2: Generate Story with Smart Context**
- Route: `/ai-generate?epicId=xxx`
- UI: Context selector shows "Comprehensive" option (Pro+)
- Actions: User selects Comprehensive context level, enters story requirements
- Evidence: `components/story-generation/ContextSelector.tsx:56-62`

**Step 3: Semantic Search Executes**
- API: `POST /api/ai/generate-stories` with `contextLevel: COMPREHENSIVE` (`app/api/ai/generate-stories/route.ts:156-208`)
- Actions: System queries embeddings for similar stories in epic, finds top 5 with similarity ≥ 0.7
- Result: Similar stories added to prompt context
- Evidence: `app/api/ai/generate-stories/route.ts:168-197`

**Step 4: AI Generates Story with Context**
- Actions: AI model receives requirements + similar stories, generates consistent story
- Result: Story with 75% better accuracy (as claimed in features)
- Evidence: `lib/services/embeddings.service.ts:102-242`

---

### 3.4 Document Upload + Custom Document Templates Selection

**Step 1: Upload Document**
- Route: `/ai-generate` → Document mode (`app/ai-generate/page.tsx:89-95`)
- UI: File dropzone or file picker
- API: `POST /api/documents/upload` (`app/api/documents/upload/route.ts:9-80`)
- Actions: User uploads PDF/DOCX/TXT/MD file (max 10MB)
- Result: Document stored, document ID returned
- Evidence: `app/api/documents/upload/route.ts:9-80`

**Step 2: Select Custom Template (Core+)**
- UI: Custom template selector (`components/ai/custom-template-manager.tsx`)
- API: `GET /api/custom-templates` (`app/api/custom-templates/route.ts:50-70`)
- Actions: User selects custom template from list
- Result: Template format loaded
- Evidence: `lib/repositories/story-templates.repository.ts:142-176`

**Step 3: Analyze Document**
- API: `POST /api/ai/analyze-document` (`app/api/ai/analyze-document/route.ts:12-199`)
- Actions: System extracts text, analyzes with AI, applies custom template format
- Result: Structured analysis with suggested stories
- Evidence: `app/api/ai/analyze-document/route.ts:12-199`

**Step 4: Generate Stories from Analysis**
- Actions: User reviews analysis, clicks "Generate Stories"
- API: `POST /api/ai/generate-stories` with `customTemplateId` (`app/api/ai/generate-stories/route.ts:227-280`)
- Result: Stories generated using custom template format
- Evidence: `app/api/ai/generate-stories/route.ts:227-280`

---

### 3.5 Export Flows (Jira/CSV/Word/PDF)

**Step 1: Navigate to Project/Stories**
- Route: `/projects/[projectId]` or `/stories`
- UI: Export button (`components/export-button.tsx:16-96`)
- Actions: User clicks "Export" button
- Evidence: `components/export-button.tsx:23-96`

**Step 2: Select Export Format**
- UI: Format dropdown (Word, Excel, PDF, CSV, Jira)
- Actions: User selects format
- Evidence: Export button component

**Step 3: Export Executes**
- API: `GET /api/projects/[projectId]/export?format=word` (`app/api/projects/[projectId]/export/route.ts:17-97`)
- Or: `GET /api/stories/export?format=jira` (`app/api/stories/export/route.ts:19-157`)
- Actions: System validates tier (Core+ for basic, Pro+ for Jira), generates file
- Result: File download (DOCX, XLSX, PDF, CSV, or Jira JSON)
- Evidence: `lib/export/exporters.ts:1-356`

**Note:** Jira export currently returns stub response (full integration Q2 2026) — `lib/services/integrationsService.ts:197-203`

---

### 3.6 Team Features: Shared AI Pool, Template Library, Admin Dashboard

**Step 1: Team Plan Sign-Up**
- Route: `/pricing` → Team plan (`app/pricing/page.tsx:234-241`)
- Actions: User selects Team plan (min 5 seats), completes checkout
- Result: Organization upgraded to Team tier with pooling enabled
- Evidence: `config/plans.json:109-146`

**Step 2: Shared AI Pool Usage**
- API: `GET /api/billing/ai-actions-usage` (`app/api/billing/ai-actions-usage/route.ts`)
- UI: Usage dashboard showing pooled actions
- Actions: Team members use AI features, actions deducted from shared pool
- Result: Pool = 10,000 base + (1,000 × seats), soft cap 2,000/user
- Evidence: `lib/services/ai-actions-metering.service.ts:69-79`

**Step 3: Team Template Library**
- Route: Template management page
- API: `GET /api/custom-templates` (filters by organization) (`app/api/custom-templates/route.ts:50-70`)
- UI: Template list with shared permissions
- Actions: Admin creates template, team members use it
- Result: Shared templates available to all team members
- Evidence: `lib/repositories/story-templates.repository.ts:142-176`

**Step 4: Admin Dashboard**
- Route: `/settings/admin` (implied)
- UI: Project oversight, usage analytics, team management
- Actions: Admin views team usage, manages seats
- Evidence: Plan features mention admin dashboard (`config/plans.json:144`)

---

### 3.7 Upgrade/Downgrade Paths, Contact Sales Flow

**Step 1: View Current Plan**
- Route: `/settings/billing` (implied)
- UI: Current plan card, usage stats, upgrade options
- Actions: User views plan details
- Evidence: Billing settings (referenced in pricing page)

**Step 2: Upgrade to Paid Plan**
- Route: `/pricing` (`app/pricing/page.tsx:115-177`)
- Actions: User selects plan, clicks "Start Free Trial"
- API: `POST /api/billing/create-checkout` (`app/api/billing/create-checkout/route.ts`)
- Result: Redirect to Stripe checkout
- Evidence: `app/pricing/page.tsx:152-169`

**Step 3: Contact Sales (Enterprise)**
- Route: `/pricing` → Enterprise plan (`app/pricing/page.tsx:127-130`)
- Actions: User clicks "Contact Sales →"
- Result: Redirect to `/contact`
- Evidence: `app/pricing/page.tsx:127-130`, `components/pricing/PricingGrid.tsx:91`

**Step 4: Downgrade**
- Route: `/settings/billing` → Cancel subscription
- API: Stripe portal (`app/api/billing/portal/route.ts`)
- Actions: User cancels subscription
- Result: Organization downgraded to Starter tier
- Evidence: Stripe webhook handling (referenced in webhook route)

---

## 4. Entitlements Summary

See `docs/feature_matrix.csv` for complete plan-to-feature mapping.

**Key Gating Rules:**
- Starter: 25 AI actions, single story generation, Word/Excel export
- Core: 400 AI actions, 20% rollover, custom templates, split up to 3 children
- Pro: 800 AI actions, Smart Context, semantic search, Jira export (stub)
- Team: 10k base + 1k/seat, pooling, Deep Reasoning, admin dashboard, split up to 7 children
- Enterprise: Custom actions, SSO, RBAC, unlimited splits, compliance features

**Evidence:**
- Plan definitions: `config/plans.json:5-184`
- Feature gating: `lib/middleware/feature-gate.ts:33-119`
- Subscription limits: `lib/constants.ts:44-656`

---

## 5. Exports & Integrations

**Supported Formats:**
- Word (DOCX) — `lib/export/exporters.ts:151-237`
- Excel (XLSX) — `lib/export/exporters.ts:39-149`
- PDF — `lib/export/exporters.ts:243-356`
- CSV — Referenced in plan features (`config/plans.json:105`)
- Jira (stub, Q2 2026) — `lib/services/integrationsService.ts:197-203`

**Export Endpoints:**
- Projects: `GET /api/projects/[projectId]/export` (`app/api/projects/[projectId]/export/route.ts:17-97`)
- Stories: `GET /api/stories/export` (`app/api/stories/export/route.ts:19-157`)

**Plan Gating:**
- Starter: Word/Excel only — `config/plans.json:33`
- Core+: All formats — `app/api/projects/[projectId]/export/route.ts:22`
- Pro+: Jira/CSV — `config/plans.json:105`

**Evidence:**
- Export utilities: `lib/export/exporters.ts:1-356`
- Integration stubs: `lib/services/integrationsService.ts:8-203`

---

## 6. Security/Compliance Options

**Enterprise Features:**
- SSO/SAML — `config/plans.json:168`
- RBAC — `config/plans.json:169`
- Audit logging — `config/plans.json:181`
- Private cloud options — `config/plans.json:181`
- Compliance features — `config/plans.json:181`

**Evidence:**
- Enterprise plan: `config/plans.json:148-184`
- Database schema (audit fields): `lib/db/schema.ts:96-148`

---

## 7. Events & Metrics

**Telemetry Events:**
- Story generation: `metrics.increment('story.created')` — `lib/observability/metrics.ts:91`
- Story split: `metrics.increment('story_split.committed')` — `lib/services/story-split.service.ts:162`
- AI latency: `metrics.timing('ai.latency')` — `lib/ai/story-generation.service.ts:93`
- Rate limit hits: `metrics.increment('rate_limit.hit')` — `lib/observability/metrics.ts:87`

**Metrics Service:**
- Location: `lib/observability/metrics.ts:1-92`
- Methods: `increment()`, `gauge()`, `timing()`, `histogram()`
- Production: Sends to Datadog/Prometheus — `lib/observability/metrics.ts:30-32`

**Sentry Integration:**
- Client: `instrumentation-client.ts:1-59`
- Server: `instrumentation.ts` (referenced)
- Error tracking with PII redaction

**Evidence:**
- Metrics: `lib/observability/metrics.ts:1-92`
- AI observability: `lib/ai/observability.service.ts:1-135`
- Sentry: `instrumentation-client.ts:1-59`

---

## 8. Validation & Tests

**Validation Scripts:**
- Plan validation: `scripts/validate-plans-production.ts:1-932`
  - Validates plan config, UI, feature enforcement, Stripe metadata, DB schema
  - Evidence: `scripts/validate-plans-production.ts:176-370`

**Test Files:**
- Pricing components: `__tests__/pricing-components.test.tsx`
- Story generation: `tests/integration/ai-backlog-builder.test.ts` (referenced)
- Story split: `tests/unit/validate-story-schema.test.ts`

**Feature Gating Tests:**
- Tier access: `tests/helpers/subscription-test-helpers.ts:634`
- Deep Reasoning gating: `__tests__/pricing-components.test.tsx:203-239`

**Evidence:**
- Validation script: `scripts/validate-plans-production.ts:1-932`
- Test helpers: `tests/helpers/subscription-test-helpers.ts`

---

## 9. Appendices

### 9.1 CSV Files
- `docs/feature_matrix.csv` — Feature-to-plan matrix
- `docs/microcopy_inventory.csv` — UI text inventory
- `docs/api_inventory.csv` — API routes inventory
- `docs/events_inventory.csv` — Telemetry events inventory

### 9.2 Key Source Files
- Plan config: `config/plans.json`
- Database schema: `lib/db/schema.ts`
- Feature gating: `lib/middleware/feature-gate.ts`
- Subscription limits: `lib/constants.ts`
- AI services: `lib/ai/story-generation.service.ts`, `lib/services/embeddings.service.ts`
- Export utilities: `lib/export/exporters.ts`

---

**End of Dossier**

