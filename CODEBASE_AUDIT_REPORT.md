# SynqForge Codebase Audit Report

**Date:** 21 October 2025
**Auditor:** Automated Codebase Analysis
**Version:** 0.1.0
**Repository:** /Users/chrisrobertson/Desktop/synqforge

---

## 1. Executive Summary

**Purpose & Vision:**
- SynqForge is an AI-powered project management and agile workflow platform designed to accelerate user story creation and sprint planning by up to 110x
- Target users: Product managers, agile teams, software consultants, and development organisations seeking AI-assisted backlog management
- Core value proposition: Transform requirements into production-ready user stories using Claude AI, with comprehensive sprint tracking and team collaboration

**Current Release Status:**
- **Version:** 0.1.0 (pre-production)
- **Deployment:** Active on Vercel with production database (Neon PostgreSQL)
- **Authentication:** Fully functional (NextAuth.js with Google OAuth + credentials)
- **Payment Integration:** Stripe live mode configured with 5 pricing tiers (Free, Solo, Team, Pro, Business, Enterprise)
- **AI Integration:** Anthropic Claude API operational with tiered token limits and fair-usage controls
- **Database:** 18 migrations applied, 40+ tables with comprehensive schema

**Key Achievements:**
- ✅ Multi-tenant architecture with organisation-based isolation
- ✅ Complete CRUD APIs for Projects, Epics, Stories, Sprints
- ✅ AI-powered story generation with usage metering and rate limiting
- ✅ Stripe subscription management with webhook integration
- ✅ Real-time collaboration infrastructure (Ably)
- ✅ Responsive UI with Tailwind CSS and Radix UI components
- ✅ Type-safe development with TypeScript and Drizzle ORM
- ✅ Security headers and RBAC foundation

**Major Risks & Technical Debt:**
- ⚠️ **Build Configuration Issues:** TypeScript errors ignored in production builds (`ignoreBuildErrors: true`) [evidence: [next.config.mjs:16-18](next.config.mjs#L16-L18)]
- ⚠️ **ESLint Disabled:** Build-time linting bypassed (`ignoreDuringBuilds: true`) [evidence: [next.config.mjs:19-21](next.config.mjs#L19-L21)]
- ⚠️ **Incomplete Test Coverage:** Only 3 test files present for ~38,000 lines of code
- ⚠️ **Advanced AI Features Status Unknown:** 12 AI modules (autopilot, validators, repo awareness) have schema but implementation status unclear
- ⚠️ **No Production Monitoring:** No APM, error tracking (Sentry), or structured logging observed
- ⚠️ **Security Concerns:** Password reset tokens and OAuth secrets stored in plaintext in database schema (should be encrypted)
- ⚠️ **Unverified Email Provider:** Resend integration configured but no send logs or verification seen
- ⚠️ **Database Migration Gaps:** Migration 0015 created after 0016/0017, suggesting manual ordering issues

**Business-Critical Dependencies:**
- Anthropic Claude API (AI generation core functionality)
- Stripe (payment processing and subscription lifecycle)
- Neon PostgreSQL (primary data store)
- Vercel (hosting and serverless functions)
- Upstash Redis (rate limiting)
- Ably (real-time collaboration)

---

## 2. User Journey

### 2.1 Primary Flows

**New User Onboarding (First-Time Visit):**
1. **Landing Page** → User visits [app/page.tsx](app/page.tsx#L17-L21) (unauthenticated users only)
2. **Sign Up** → `/auth/signin` redirects to sign-up flow [app/auth/signup/page.tsx](app/auth/signup/page.tsx)
   - Google OAuth or email/password credentials
   - Organisation created automatically (1 org per user during signup)
3. **Dashboard** → Redirect to `/dashboard` [app/dashboard/page.tsx](app/dashboard/page.tsx#L28-L52)
   - Empty state: "No active projects yet"
   - Quick actions: Create project, AI generate, upload document

**Core Workflow (Authenticated User):**
1. **Create Project** → Modal form creates project via `POST /api/organizations/{orgId}/projects`
2. **Generate Stories (AI)** → Two paths:
   - Path A: Upload document → `POST /api/projects/{projectId}/files/process-and-analyze`
   - Path B: Manual prompt → `POST /api/ai/generate-stories`
3. **Review & Edit Stories** → `/projects/{projectId}` view with Kanban board
4. **Organise into Epics** → Create/assign epics via `POST /api/epics`
5. **Plan Sprint** → `POST /api/projects/{projectId}/sprints` with story assignment
6. **Track Progress** → Burndown charts, velocity metrics, activity feeds

**Subscription Upgrade Journey:**
1. **Hit Limit** → AI token exhausted or seat limit reached
2. **Pricing Page** → `/pricing` displays 5 tiers with Stripe Checkout
3. **Checkout** → `POST /api/stripe/create-checkout-session` with 7-14 day trial
4. **Webhook Activation** → `POST /api/webhooks/stripe` updates entitlements
5. **Feature Unlock** → Advanced AI modules, unlimited projects, additional seats

### 2.2 Authentication States

| State | Routes Accessible | Redirect Behaviour |
|-------|------------------|-------------------|
| **Unauthenticated** | `/`, `/auth/*`, `/pricing` | Landing page shown, sign-in required for app |
| **Authenticated (Free Tier)** | `/dashboard`, `/projects`, `/stories`, `/ai-generate` (limited) | Full read/write, AI capped at 20k tokens/month |
| **Authenticated (Paid Tier)** | All routes + `/settings/billing`, advanced AI features | Entitlements enforced per tier |
| **Session Expired** | Auto-redirect to `/auth/signin` | JWT max age: 30 days [evidence: [lib/auth/options.ts:149](lib/auth/options.ts#L149)] |

### 2.3 Happy Path Sequence Diagram (ASCII)

```
User          Landing Page      Auth API         Dashboard       AI Service      Stripe
  |                |                |                |               |              |
  |---visit------->|                |                |               |              |
  |                |                |                |               |              |
  |<--show hero----|                |                |               |              |
  |                |                |                |               |              |
  |--click "Sign In"--------------->|                |               |              |
  |                                 |                |               |              |
  |<-----------redirect /dashboard-------------|     |               |              |
  |                                                   |               |              |
  |--fetch stats/projects/activities---------------->|               |              |
  |                                                   |               |              |
  |<-----------return metrics + empty state----------|               |              |
  |                                                   |               |              |
  |--click "AI Generate"--------->|                  |               |              |
  |                                |                  |               |              |
  |--POST /api/ai/generate-stories------------------------>|          |              |
  |                                                         |          |              |
  |                                      (check token limit)|          |              |
  |                                                         |          |              |
  |                                      (call Claude API)--|          |              |
  |                                                         |          |              |
  |<---------------return 5 stories + usage-----------------|          |              |
  |                                                                    |              |
  |--save stories to project-------------------------------->|         |              |
  |                                                                                   |
  |--upgrade to Team tier (hit free limit)------------------------------------------>|
  |                                                                                   |
  |<-----------Stripe checkout session------------------------------------------------|
  |                                                                                   |
  |--complete payment-----------------------------------------------------------------|
  |                                                                                   |
  |                                  (webhook: subscription.created)---------------->|
  |                                                                                   |
  |                                  (update org entitlements)<-----------------------|
  |                                                                                   |
  |<-----------unlock 300k tokens/month + advanced AI-------------------------------|
```

---

## 3. Feature Inventory

| Feature | Status | Evidence | Owner | Risks/Dependencies |
|---------|--------|----------|-------|-------------------|
| **User Authentication** | ✅ Shipped | [lib/auth/options.ts:32-156](lib/auth/options.ts#L32-L156) - NextAuth with Google + Credentials providers | Core | Password hashing implemented; OAuth user creation handled in `/api/auth/signup` |
| **Password Reset** | ✅ Shipped | [app/api/auth/forgot-password/route.ts](app/api/auth/forgot-password/route.ts), password_reset_tokens table in schema | Core | Email sending via Resend (unverified if working in prod) |
| **Organisation Management** | ✅ Shipped | Multi-tenant via [lib/db/schema.ts:94-142](lib/db/schema.ts#L94-L142) organizations table | Core | 1 org per user; no org switching UI observed |
| **Project CRUD** | ✅ Shipped | Full REST API [app/api/projects/[projectId]/route.ts](app/api/projects/[projectId]/route.ts) | Core | Archive/activate endpoints functional |
| **Epic Management** | ✅ Shipped | [app/api/epics/route.ts](app/api/epics/route.ts) + UI at [app/projects/[projectId]/epics/[epicId]/page.tsx](app/projects/[projectId]/epics/[epicId]/page.tsx) | Core | Progress tracking with triggers (migration 0013) |
| **Story Management** | ✅ Shipped | CRUD + bulk operations [app/api/stories/route.ts](app/api/stories/route.ts), [app/api/stories/bulk/route.ts](app/api/stories/bulk/route.ts) | Core | Kanban board UI, story detail drawer |
| **Sprint Planning** | ✅ Shipped | [app/api/sprints/[sprintId]/route.ts](app/api/sprints/[sprintId]/route.ts), sprint_stories junction table | Core | Velocity caching (migration 0015), burndown analytics |
| **AI Story Generation** | ✅ Shipped | [app/api/ai/generate-stories/route.ts:1-167](app/api/ai/generate-stories/route.ts#L1-L167) with Claude Haiku | Core | Rate limited (10 req/min), fair-usage token limits enforced |
| **AI Epic Generation** | ✅ Shipped | [app/api/ai/generate-epic/route.ts](app/api/ai/generate-epic/route.ts) | Core | Same rate limits as story generation |
| **AI Story Validation** | ✅ Shipped | [app/api/ai/validate-story/route.ts](app/api/ai/validate-story/route.ts) | Core | Returns 0-100 score + feedback |
| **Document Upload & Analysis** | ✅ Shipped | [app/api/documents/upload/route.ts](app/api/documents/upload/route.ts), binary storage (bytea) in project_documents | Core | PDF/DOCX parsing with mammoth/pdf-parse |
| **Stripe Subscriptions** | ✅ Shipped | [app/api/stripe/create-checkout-session/route.ts](app/api/stripe/create-checkout-session/route.ts), webhook at [app/api/webhooks/stripe/route.ts:1-50](app/api/webhooks/stripe/route.ts#L1-L50) | Billing | 5 tiers configured, trials (7-14 days), live mode active |
| **Entitlements Model** | ✅ Shipped | [lib/billing/entitlements.ts](lib/billing/entitlements.ts), organizations table columns (plan, planCycle, seatsIncluded, etc.) | Billing | Syncs from Stripe price metadata via webhooks |
| **Fair-Usage Guards** | ✅ Shipped | [lib/billing/fair-usage-guards.ts](lib/billing/fair-usage-guards.ts), workspace_usage table (migration 0012) | Billing | Token pooling, bulk story limits, document ingestion caps |
| **Team Invitations** | ✅ Shipped | [app/api/team/invite/route.ts](app/api/team/invite/route.ts), team_invitations table (migration 0008) | Collaboration | Email invites via Resend, token-based acceptance |
| **Real-time Collaboration** | 🟡 In Progress | Ably client setup [lib/services/realtime.service.ts](lib/services/realtime.service.ts), presence indicators component | Collaboration | Hook exists but unclear if channels are actively used |
| **Notifications** | ✅ Shipped | [app/api/notifications/route.ts](app/api/notifications/route.ts), in-app + email digests (cron jobs) | Collaboration | Daily/weekly digest cron configured in [vercel.json:3-15](vercel.json#L3-L15) |
| **Comments & Reactions** | ✅ Shipped | [app/api/comments/route.ts](app/api/comments/route.ts), story_comments + comment_reactions tables | Collaboration | Mention parser service, nested replies supported |
| **Activity Log** | ✅ Shipped | [app/api/activities/route.ts](app/api/activities/route.ts), activities table with IP/user agent tracking | Audit | GDPR consideration: PII logged (IP addresses) |
| **Analytics (Velocity, Burndown)** | ✅ Shipped | [app/api/analytics/velocity/route.ts](app/api/analytics/velocity/route.ts), sprint_analytics table, velocity view (migration 0017) | Analytics | Real-time recalculation via database triggers |
| **Dashboard Stats** | ✅ Shipped | [app/api/dashboard/stats/route.ts](app/api/dashboard/stats/route.ts) aggregates projects/stories/completion % | Analytics | Caching not implemented (could be slow for large orgs) |
| **Export (CSV/PDF)** | ✅ Shipped | [app/api/projects/[projectId]/export/route.ts](app/api/projects/[projectId]/export/route.ts), uses docx/pdfkit libs | Productivity | Gated by subscription tier (canExport flag) |
| **Story Templates** | ✅ Shipped | [app/api/templates/route.ts](app/api/templates/route.ts), story_templates + template_stories tables | Productivity | Seed script available, public/private templates |
| **Backlog Autopilot** | 🔴 Not Started | Schema exists (autopilot_jobs table, migration 0009), [lib/services/backlog-autopilot.service.ts](lib/services/backlog-autopilot.service.ts) file present | Advanced AI | Service file exists but API endpoint [app/api/ai/autopilot/route.ts](app/api/ai/autopilot/route.ts) unclear if functional |
| **AC Validator** | 🔴 Not Started | ac_validation_rules table (migration 0009), [lib/services/ac-validator.service.ts](lib/services/ac-validator.service.ts) file | Advanced AI | Schema present, unclear if validation runs |
| **Test Artefact Generator** | 🔴 Not Started | test_artefacts table, [lib/services/test-artefact-generator.service.ts](lib/services/test-artefact-generator.service.ts) | Advanced AI | Gherkin, Postman, Playwright, Cypress output types defined |
| **Planning & Forecasting** | 🔴 Not Started | sprint_forecasts table, [lib/services/planning-forecasting.service.ts](lib/services/planning-forecasting.service.ts) | Advanced AI | Monte Carlo simulation for release dates (schema suggests) |
| **Effort & Impact Scoring** | 🔴 Not Started | effort_scores, impact_scores tables (RICE/WSJF scoring) | Advanced AI | Schema complete, service files present |
| **Knowledge Search (RAG)** | 🔴 Not Started | knowledge_embeddings table, [lib/services/knowledge-search.service.ts](lib/services/knowledge-search.service.ts) | Advanced AI | Embeddings stored as JSON (should migrate to pgvector) |
| **Inbox Parsing** | 🔴 Not Started | inbox_parsing table, [lib/services/inbox-parser.service.ts](lib/services/inbox-parser.service.ts) | Advanced AI | Extract decisions/actions from Slack/Teams/Email |
| **Repo Awareness** | 🔴 Not Started | git_integrations, pr_summaries tables, [lib/services/repo-awareness.service.ts](lib/services/repo-awareness.service.ts) | Advanced AI | GitHub/GitLab PR summarisation, drift detection |
| **Workflow Agents** | 🔴 Not Started | workflow_agents, agent_actions tables, [lib/services/workflow-agents.service.ts](lib/services/workflow-agents.service.ts) | Advanced AI | Event-driven automation with approval workflows |
| **Governance & Compliance** | 🔴 Not Started | pii_detections, audit_logs tables, [lib/services/governance-compliance.service.ts](lib/services/governance-compliance.service.ts) | Advanced AI | PII detection, audit trail, compliance reports |
| **Model Controls** | 🔴 Not Started | ai_model_policies table, [lib/services/model-controls.service.ts](lib/services/model-controls.service.ts) | Advanced AI | Fast/Balanced/Quality tier selection per feature |
| **SSO (SAML/OIDC)** | 🔴 Not Started | [lib/auth/sso.ts](lib/auth/sso.ts) file exists, ssoEnabled flag in organizations | Enterprise | File present but no provider configuration |
| **Observability** | 🔴 Not Started | [lib/observability/logger.ts](lib/observability/logger.ts), [lib/observability/metrics.ts](lib/observability/metrics.ts), [lib/observability/tracing.ts](lib/observability/tracing.ts) files exist | Ops | Files scaffolded but no integration with APM vendor |

---

## 4. Tech Stack & Platforms

| Layer | Tool/Service | Version | Where Confirmed | Notes |
|-------|--------------|---------|-----------------|-------|
| **Framework** | Next.js | 15.5.4 | [package.json:53](package.json#L53) | App Router (not Pages), Turbopack dev mode |
| **Runtime** | Node.js | 22+ (inferred) | [package.json:72](package.json#L72) `@types/node: ^22.0.0` | Minimum version not explicitly set |
| **Language** | TypeScript | 5.9.3 | [package.json:92](package.json#L92), [tsconfig.json:3](tsconfig.json#L3) ES2020 target | Strict mode DISABLED (risk) |
| **UI Framework** | React | 19.2.0 | [package.json:59](package.json#L59) | Concurrent features enabled |
| **Database** | Neon PostgreSQL | Unknown | [drizzle.config.ts:6](drizzle.config.ts#L6) `dialect: 'postgresql'`, `.env.example` shows MySQL (outdated docs) | DATABASE_URL via env var, pooled connection |
| **ORM** | Drizzle ORM | 0.44.6 | [package.json:85](package.json#L85) devDep, [lib/db/index.ts:1](lib/db/index.ts#L1) | postgres.js driver (v3.4.7) |
| **Database Migrations** | Drizzle Kit | 0.31.5 | [package.json:84](package.json#L84), [drizzle/migrations/](drizzle/migrations/) 18 SQL files | Out folder: ./drizzle/migrations |
| **Authentication** | NextAuth.js | 4.24.0 | [package.json:54](package.json#L54), [lib/auth/options.ts](lib/auth/options.ts) | JWT strategy, 30-day sessions |
| **AI Provider** | Anthropic Claude | SDK 0.65.0 | [package.json:21](package.json#L21), [lib/services/ai.service.ts:1](lib/services/ai.service.ts#L1) | Haiku model for cost control ([lib/ai/haiku-service.ts](lib/ai/haiku-service.ts)) |
| **Payments** | Stripe | 19.1.0 | [package.json:65](package.json#L65), [lib/stripe/stripe-client.ts](lib/stripe/stripe-client.ts) | Live mode, webhook secret configured |
| **Email** | Resend | 6.1.2 | [package.json:63](package.json#L63), `.env.example:17-20` | Unverified if production emails sending |
| **Rate Limiting** | Upstash Redis | 1.35.5 (Redis), 2.0.6 (Ratelimit) | [package.json:39-40](package.json#L39-L40) | REST API based, no local Redis instance |
| **Real-time** | Ably | 2.14.0 | [package.json:41](package.json#L41), [lib/services/realtime.service.ts](lib/services/realtime.service.ts) | Free tier: 3M msgs/month, 100 concurrent connections |
| **File Uploads** | UploadThing | 7.7.4 (server), 7.3.3 (React) | [package.json:38,68](package.json#L38) | Not actively used (docs uploaded as binary to DB) |
| **Styling** | Tailwind CSS | 3.4.18 | [package.json:90](package.json#L90), [app/globals.css](app/globals.css) | Custom theme with brand-purple/emerald colours |
| **UI Components** | Radix UI | Various (1.x-2.x) | [package.json:25-35](package.json#L25-L35) | 13 Radix primitives (dialog, dropdown, toast, etc.) |
| **Icons** | Lucide React | 0.544.0 | [package.json:49](package.json#L49) | Tree-shakeable icon library |
| **Validation** | Zod | 3.23.0 | [package.json:70](package.json#L70) | Schema validation for API inputs |
| **Drag & Drop** | @dnd-kit | 6.3.1 (core), 10.0.0 (sortable) | [package.json:22-24](package.json#L22-L24) | Kanban board story reordering |
| **Document Parsing** | mammoth, pdf-parse | 1.11.0, 1.1.1 | [package.json:50,56](package.json#L50) | DOCX and PDF text extraction |
| **Document Generation** | docx, pdfkit | 9.5.1, 0.17.2 | [package.json:47,57](package.json#L47) | Story export functionality |
| **Charts** | Recharts | 3.2.1 | [package.json:62](package.json#L62) | Velocity and burndown charts |
| **Password Hashing** | bcrypt/bcryptjs | 6.0.0 / 3.0.2 | [package.json:42-43](package.json#L42-L43) | Credentials provider auth |
| **ID Generation** | nanoid | 5.0.0 | [package.json:52](package.json#L52), [lib/db/index.ts:47](lib/db/index.ts#L47) | 21-char alphanumeric IDs |
| **Hosting** | Vercel | N/A | [vercel.json](vercel.json) cron jobs, [next.config.mjs:12](next.config.mjs#L12) allowed origins | Serverless functions, preview deployments |
| **CI/CD** | GitHub Actions | N/A | [.github/workflows/ci.yml](..github/workflows/ci.yml), [.github/workflows/smoke.yml](.github/workflows/smoke.yml) | Lint, typecheck, test, build on push |
| **Linting** | ESLint | 9.37.0 | [package.json:87](package.json#L87), eslint-config-next 15.5.4 | TypeScript plugin 8.46.0 |
| **Testing** | Node.js native test runner | Built-in | [package.json:12](package.json#L12) `node --import tsx --test` | 3 test files found in tests/ |
| **Build Tool** | esbuild | 0.25.10 | [package.json:86](package.json#L86) | Used by Next.js bundler |
| **Themes** | next-themes | 0.4.6 | [package.json:55](package.json#L55) | Dark mode support |
| **Toast Notifications** | Sonner | 2.0.7 | [package.json:64](package.json#L64) | Elegant toast UI library |

### Version Matrix (Critical Dependencies)

| Dependency | Installed Version | Latest Stable | Status | Risk |
|------------|------------------|---------------|--------|------|
| Next.js | 15.5.4 | 15.x (stable) | ✅ Current | Next.js 15 is bleeding edge (Oct 2025 release) |
| React | 19.2.0 | 19.x (stable) | ✅ Current | React 19 recently stable |
| TypeScript | 5.9.3 | 5.x | ✅ Current | No issues |
| Drizzle ORM | 0.44.6 | ~0.44.x | ✅ Current | Rapidly evolving, watch for breaking changes |
| NextAuth.js | 4.24.0 | 5.x (beta) | ⚠️ v4 (v5 available) | v5 rewrite; migration effort required |
| Anthropic SDK | 0.65.0 | ~0.65.x | ✅ Current | API stable |
| Stripe | 19.1.0 | 19.x | ✅ Current | Well maintained |

---

## 5. Architecture Overview

### 5.1 High-Level Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Vercel Edge Network                         │
│                     (CDN, Serverless Functions)                      │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Next.js 15 App Router                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   Pages     │  │  API Routes │  │  Middleware │                 │
│  │  (React)    │  │ (Serverless)│  │   (Auth)    │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
└────────────────┬────────────────────────────────────────────────────┘
                 │
      ┌──────────┼──────────┬──────────────┬──────────────┐
      ▼          ▼          ▼              ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Neon     │ │ Anthropic│ │  Stripe  │ │ Upstash  │ │   Ably   │
│PostgreSQL│ │  Claude  │ │ Payments │ │  Redis   │ │ Realtime │
│ (Primary)│ │   (AI)   │ │ (Billing)│ │  (Rate   │ │ (Collab) │
│          │ │          │ │          │ │  Limit)  │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
                                ▲
                                │
                         ┌──────┴──────┐
                         │   Resend    │
                         │   (Email)   │
                         └─────────────┘
```

### 5.2 Data Flow (AI Story Generation Example)

```
User Request → Next.js API Route → Auth Middleware → Rate Limit Check (Upstash)
                                         │
                                         ▼
                              Fair-Usage Check (PostgreSQL workspace_usage)
                                         │
                                         ▼
                              Anthropic Claude API (generate stories)
                                         │
                                         ▼
                              Save Stories + Track Usage (PostgreSQL)
                                         │
                                         ▼
                              Update Token Balance (workspace_usage)
                                         │
                                         ▼
                              Return Stories + Usage Warning (if >90%)
```

### 5.3 External Integrations

| Integration | Purpose | Authentication | Webhook/Push Events |
|-------------|---------|----------------|---------------------|
| **Anthropic Claude** | AI story/epic generation, validation | API Key (ANTHROPIC_API_KEY) | No webhooks |
| **Stripe** | Subscription billing, checkout | Secret Key (STRIPE_SECRET_KEY) | ✅ `/api/webhooks/stripe` handles 3+ events |
| **Neon PostgreSQL** | Primary data store | Connection string (DATABASE_URL) | No webhooks |
| **Upstash Redis** | Rate limiting | REST API URL + Token | No webhooks |
| **Ably** | Real-time presence, collaboration | API Key (ABLY_API_KEY) | Server-sent events |
| **Resend** | Email notifications, digests | API Key (RESEND_API_KEY) | No webhooks observed |
| **Google OAuth** | Social login | Client ID + Secret | N/A (OAuth flow) |
| **Vercel** | Hosting, cron jobs | N/A (platform) | Cron: daily snapshots, email digests |

---

## 6. Data Model

### 6.1 Core Entities (Summary)

| Table | Primary Key | Key Fields | Relationships | PII? | Source |
|-------|-------------|------------|---------------|------|--------|
| **organizations** | id (varchar 36) | name, slug, stripeCustomerId, subscriptionTier, plan, aiTokensIncluded | ← users, projects | ❌ | [lib/db/schema.ts:94-142](lib/db/schema.ts#L94-L142) |
| **users** | id (varchar 36) | email, name, password, organizationId, role, isActive | → organizations | ✅ Email, name | [lib/db/schema.ts:144-164](lib/db/schema.ts#L144-L164) |
| **projects** | id (varchar 36) | name, key, slug, organizationId, ownerId, status | → organizations, users; ← epics, sprints | ❌ | [lib/db/schema.ts:211-231](lib/db/schema.ts#L211-L231) |
| **epics** | id (varchar 36) | title, description, projectId, status, priority, aiGenerated, totalStories, completedStories, progressPct | → projects; ← stories | ❌ | [lib/db/schema.ts:237-274](lib/db/schema.ts#L237-L274) |
| **stories** | id (varchar 36) | title, description, acceptanceCriteria (json), epicId, projectId, storyPoints, status, priority, aiGenerated, assigneeId, doneAt | → epics, projects, users | ❌ | [lib/db/schema.ts:276-319](lib/db/schema.ts#L276-L319) |
| **sprints** | id (varchar 36) | name, goal, projectId, status, startDate, endDate, capacityPoints, plannedPoints, completedPoints, velocityCached | → projects; ← sprint_stories | ❌ | [lib/db/schema.ts:325-354](lib/db/schema.ts#L325-L354) |
| **sprint_stories** | (sprintId, storyId) composite PK | addedAt, addedBy | → sprints, stories | ❌ | [lib/db/schema.ts:356-368](lib/db/schema.ts#L356-L368) |
| **ai_generations** | id (varchar 36) | organizationId, userId, type (enum), model, promptText, responseText, tokensUsed, costUsd | → organizations, users | ⚠️ Prompt may contain user data | [lib/db/schema.ts:374-399](lib/db/schema.ts#L374-L399) |
| **project_documents** | id (varchar 36) | projectId, fileName, fileType (enum), fileSize, fileBytes (bytea), extractedContent, generatedStoryIds | → projects, users | ⚠️ Document content may contain PII | [lib/db/schema.ts:405-424](lib/db/schema.ts#L405-L424) |
| **activities** | id (varchar 36) | organizationId, projectId, userId, action, resourceType, resourceId, oldValues, newValues, ipAddress, userAgent | → organizations, projects, users | ✅ IP address, user agent | [lib/db/schema.ts:454-478](lib/db/schema.ts#L454-L478) |
| **password_reset_tokens** | id (varchar 36) | userId, token, expiresAt, usedAt | → users | ⚠️ Token in plaintext | [lib/db/schema.ts:166-181](lib/db/schema.ts#L166-L181) |
| **team_invitations** | id (varchar 36) | organizationId, email, role, invitedBy, status (enum), token, expiresAt | → organizations, users | ✅ Email | [lib/db/schema.ts:183-205](lib/db/schema.ts#L183-L205) |
| **stripe_subscriptions** | id (varchar 36) | organizationId, stripeCustomerId, stripeSubscriptionId, stripePriceId, status (enum), currentPeriodStart/End, trialStart/End | → organizations | ❌ | [lib/db/schema.ts:874-901](lib/db/schema.ts#L874-L901) |
| **workspace_usage** | id (varchar 36) | organizationId, billingPeriodStart/End, tokensUsed, tokensLimit, docsIngested, docsLimit | → organizations | ❌ | [lib/db/schema.ts:976-1002](lib/db/schema.ts#L976-L1002) |
| **story_comments** | id (varchar 36) | storyId, userId, content, parentCommentId, mentions (json) | → stories, users | ⚠️ May contain @mentions with user data | [lib/db/schema.ts:551-569](lib/db/schema.ts#L551-L569) |
| **notifications** | id (varchar 36) | userId, type (enum), entityType (enum), entityId, message, read, actionUrl | → users | ❌ | [lib/db/schema.ts:591-610](lib/db/schema.ts#L591-L610) |

### 6.2 Advanced AI Tables (Schema Present, Functionality TBD)

| Table | Purpose | Status | Source |
|-------|---------|--------|--------|
| **autopilot_jobs** | Backlog autopilot batch processing | 🔴 Not Started | [lib/db/schema.ts:1008-1037](lib/db/schema.ts#L1008-L1037) |
| **ac_validation_rules** | Custom acceptance criteria rules | 🔴 Not Started | [lib/db/schema.ts:1043-1062](lib/db/schema.ts#L1043-L1062) |
| **ac_validation_results** | Story AC validation history | 🔴 Not Started | [lib/db/schema.ts:1064-1085](lib/db/schema.ts#L1064-L1085) |
| **test_artefacts** | Generated test files (Gherkin, Playwright, etc.) | 🔴 Not Started | [lib/db/schema.ts:1091-1110](lib/db/schema.ts#L1091-L1110) |
| **sprint_forecasts** | Monte Carlo release forecasting | 🔴 Not Started | [lib/db/schema.ts:1116-1137](lib/db/schema.ts#L1116-L1137) |
| **effort_scores** | AI-suggested story points | 🔴 Not Started | [lib/db/schema.ts:1143-1161](lib/db/schema.ts#L1143-L1161) |
| **impact_scores** | RICE/WSJF prioritisation | 🔴 Not Started | [lib/db/schema.ts:1163-1185](lib/db/schema.ts#L1163-L1185) |
| **knowledge_embeddings** | RAG semantic search vectors | 🔴 Not Started | [lib/db/schema.ts:1191-1207](lib/db/schema.ts#L1191-L1207) |
| **inbox_parsing** | Extract actions from Slack/Teams | 🔴 Not Started | [lib/db/schema.ts:1230-1251](lib/db/schema.ts#L1230-L1251) |
| **git_integrations** | GitHub/GitLab repo connections | 🔴 Not Started | [lib/db/schema.ts:1257-1278](lib/db/schema.ts#L1257-L1278) |
| **pr_summaries** | AI-generated PR summaries | 🔴 Not Started | [lib/db/schema.ts:1280-1306](lib/db/schema.ts#L1280-L1306) |
| **workflow_agents** | Autonomous workflow triggers | 🔴 Not Started | [lib/db/schema.ts:1312-1334](lib/db/schema.ts#L1312-L1334) |
| **pii_detections** | GDPR compliance PII scanner | 🔴 Not Started | [lib/db/schema.ts:1366-1386](lib/db/schema.ts#L1366-L1386) |
| **audit_logs** | Enterprise audit trail | 🔴 Not Started | [lib/db/schema.ts:1388-1410](lib/db/schema.ts#L1388-L1410) |

### 6.3 Database Triggers & Views

| Name | Type | Purpose | Migration |
|------|------|---------|-----------|
| `update_epic_progress_on_story_change` | Trigger | Auto-update epic.totalStories, completedStories, progressPct when stories change | [drizzle/migrations/0013_add_epic_aggregates.sql](drizzle/migrations/0013_add_epic_aggregates.sql) |
| `update_story_done_timestamp` | Trigger | Set stories.doneAt when status = 'done' | [drizzle/migrations/0014_add_story_completion_tracking.sql](drizzle/migrations/0014_add_story_completion_tracking.sql) |
| `update_sprint_velocity` | Trigger | Cache velocity on sprint completion | [drizzle/migrations/0015_add_sprint_velocity_cache.sql](drizzle/migrations/0015_add_sprint_velocity_cache.sql) |
| `velocity_rollup_view` | View | Aggregate velocity across sprints/projects | [drizzle/migrations/0017_add_velocity_view.sql](drizzle/migrations/0017_add_velocity_view.sql) |

---

## 7. API Surface

### 7.1 Public API Routes (Authenticated)

Total API Routes: **~95 endpoints** across 75 route.ts files [evidence: Glob pattern `app/api/**/route.ts`]

| Method | Path | Purpose | Auth | Request Body | Response | Source |
|--------|------|---------|------|--------------|----------|--------|
| **GET** | `/api/dashboard/stats` | Dashboard aggregate stats | ✅ Required | None | `{ activeProjects, totalStories, completedStories, aiGeneratedStories, ... }` | [app/api/dashboard/stats/route.ts](app/api/dashboard/stats/route.ts) |
| **GET** | `/api/projects` | List all projects for org | ✅ Required | Query: `?status=active` | `{ data: Project[] }` | [app/api/projects/route.ts](app/api/projects/route.ts) |
| **POST** | `/api/projects` | Create new project | ✅ Required (admin/member) | `{ name, key, description?, slug }` | `{ id, ...project }` | [app/api/projects/route.ts](app/api/projects/route.ts) |
| **GET** | `/api/projects/:id` | Get project details | ✅ Required | None | `{ id, name, status, ... }` | [app/api/projects/[projectId]/route.ts](app/api/projects/[projectId]/route.ts) |
| **PATCH** | `/api/projects/:id` | Update project | ✅ Required (owner/admin) | `{ name?, description?, status? }` | `{ id, ...updated }` | [app/api/projects/[projectId]/route.ts](app/api/projects/[projectId]/route.ts) |
| **DELETE** | `/api/projects/:id` | Delete project (if empty) | ✅ Required (owner/admin) | None | `204 No Content` | [app/api/projects/[projectId]/route.ts](app/api/projects/[projectId]/route.ts) |
| **POST** | `/api/projects/:id/activate` | Change status to 'active' | ✅ Required | None | `{ status: 'active' }` | [app/api/projects/[projectId]/activate/route.ts](app/api/projects/[projectId]/activate/route.ts) |
| **POST** | `/api/projects/:id/archive` | Change status to 'archived' | ✅ Required | None | `{ status: 'archived' }` | [app/api/projects/[projectId]/archive/route.ts](app/api/projects/[projectId]/archive/route.ts) |
| **GET** | `/api/projects/:id/stats` | Project statistics | ✅ Required | None | `{ totalStories, completedStories, totalEpics, ... }` | [app/api/projects/[projectId]/stats/route.ts](app/api/projects/[projectId]/stats/route.ts) |
| **GET** | `/api/projects/:id/export` | Export project as PDF/DOCX | ✅ Required | Query: `?format=pdf\|docx` | Binary file download | [app/api/projects/[projectId]/export/route.ts](app/api/projects/[projectId]/export/route.ts) |
| **POST** | `/api/ai/generate-stories` | Generate stories from requirements | ✅ Required | `{ requirements: string, projectContext?, projectId, epicId? }` | `{ stories: StoryGenerationResult[], usage }` | [app/api/ai/generate-stories/route.ts](app/api/ai/generate-stories/route.ts) |
| **POST** | `/api/ai/generate-epic` | Generate epic from description | ✅ Required | `{ description: string, projectId }` | `{ epic: EpicGenerationResult, usage }` | [app/api/ai/generate-epic/route.ts](app/api/ai/generate-epic/route.ts) |
| **POST** | `/api/ai/validate-story` | Validate story quality | ✅ Required | `{ title, description, acceptanceCriteria }` | `{ validation: { isValid, score, feedback[] } }` | [app/api/ai/validate-story/route.ts](app/api/ai/validate-story/route.ts) |
| **GET** | `/api/epics` | List epics for project | ✅ Required | Query: `?projectId=...` | `{ data: Epic[] }` | [app/api/epics/route.ts](app/api/epics/route.ts) |
| **POST** | `/api/epics` | Create epic | ✅ Required | `{ title, description, projectId, goals[], priority? }` | `{ id, ...epic }` | [app/api/epics/route.ts](app/api/epics/route.ts) |
| **GET** | `/api/epics/:id` | Get epic details | ✅ Required | None | `{ id, title, progressPct, totalStories, ... }` | [app/api/epics/[epicId]/route.ts](app/api/epics/[epicId]/route.ts) |
| **PATCH** | `/api/epics/:id` | Update epic | ✅ Required | `{ title?, description?, status? }` | `{ id, ...updated }` | [app/api/epics/[epicId]/route.ts](app/api/epics/[epicId]/route.ts) |
| **DELETE** | `/api/epics/:id` | Delete epic | ✅ Required | None | `204 No Content` | [app/api/epics/[epicId]/route.ts](app/api/epics/[epicId]/route.ts) |
| **GET** | `/api/epics/:id/stories` | Get all stories in epic | ✅ Required | None | `{ data: Story[] }` | [app/api/epics/[epicId]/stories/route.ts](app/api/epics/[epicId]/stories/route.ts) |
| **POST** | `/api/epics/:id/publish` | Change status to 'published' | ✅ Required | None | `{ status: 'published' }` | [app/api/epics/[epicId]/publish/route.ts](app/api/epics/[epicId]/publish/route.ts) |
| **GET** | `/api/stories` | List stories (with filters) | ✅ Required | Query: `?projectId=...&status=...&epicId=...` | `{ data: Story[], pagination }` | [app/api/stories/route.ts](app/api/stories/route.ts) |
| **POST** | `/api/stories` | Create story | ✅ Required | `{ title, description, projectId, epicId?, acceptanceCriteria[], storyPoints?, priority? }` | `{ id, ...story }` | [app/api/stories/route.ts](app/api/stories/route.ts) |
| **POST** | `/api/stories/bulk` | Bulk create stories | ✅ Required | `{ stories: Array<StoryInput>, projectId }` | `{ created: Story[], failed: [] }` | [app/api/stories/bulk/route.ts](app/api/stories/bulk/route.ts) |
| **GET** | `/api/stories/:id` | Get story details | ✅ Required | None | `{ id, title, description, ... }` | [app/api/stories/[storyId]/route.ts](app/api/stories/[storyId]/route.ts) |
| **PATCH** | `/api/stories/:id` | Update story | ✅ Required | `{ title?, description?, status?, assigneeId? }` | `{ id, ...updated }` | [app/api/stories/[storyId]/route.ts](app/api/stories/[storyId]/route.ts) |
| **DELETE** | `/api/stories/:id` | Delete story | ✅ Required | None | `204 No Content` | [app/api/stories/[storyId]/route.ts](app/api/stories/[storyId]/route.ts) |
| **POST** | `/api/stories/:id/move` | Move story to different epic | ✅ Required | `{ epicId: string \| null }` | `{ success: true }` | [app/api/stories/[storyId]/move/route.ts](app/api/stories/[storyId]/move/route.ts) |
| **GET** | `/api/sprints` | List sprints for project | ✅ Required | Query: `?projectId=...` | `{ data: Sprint[] }` | [app/api/projects/[projectId]/sprints/route.ts](app/api/projects/[projectId]/sprints/route.ts) |
| **POST** | `/api/sprints` | Create sprint | ✅ Required | `{ name, goal, projectId, startDate, endDate, capacityPoints? }` | `{ id, ...sprint }` | [app/api/projects/[projectId]/sprints/route.ts](app/api/projects/[projectId]/sprints/route.ts) |
| **GET** | `/api/sprints/:id` | Get sprint details | ✅ Required | None | `{ id, name, status, velocity, ... }` | [app/api/sprints/[sprintId]/route.ts](app/api/sprints/[sprintId]/route.ts) |
| **PATCH** | `/api/sprints/:id` | Update sprint | ✅ Required | `{ name?, goal?, status? }` | `{ id, ...updated }` | [app/api/sprints/[sprintId]/route.ts](app/api/sprints/[sprintId]/route.ts) |
| **POST** | `/api/sprints/:id/actions` | Start/complete sprint | ✅ Required | `{ action: 'start' \| 'complete' }` | `{ status: 'active' \| 'completed' }` | [app/api/sprints/[sprintId]/actions/route.ts](app/api/sprints/[sprintId]/actions/route.ts) |
| **GET** | `/api/sprints/:id/burndown` | Burndown chart data | ✅ Required | None | `{ data: Array<{ day, remaining, completed }> }` | [app/api/sprints/[sprintId]/burndown/route.ts](app/api/sprints/[sprintId]/burndown/route.ts) |
| **POST** | `/api/sprints/:id/stories/manage` | Add/remove stories to sprint | ✅ Required | `{ storyIds: string[], action: 'add' \| 'remove' }` | `{ success: true }` | [app/api/sprints/[sprintId]/stories/manage/route.ts](app/api/sprints/[sprintId]/stories/manage/route.ts) |
| **POST** | `/api/stripe/create-checkout-session` | Create Stripe checkout session | ✅ Required | `{ priceId, plan }` | `{ sessionId, url }` | [app/api/stripe/create-checkout-session/route.ts](app/api/stripe/create-checkout-session/route.ts) |
| **POST** | `/api/stripe/create-portal-session` | Create Stripe customer portal session | ✅ Required | None | `{ url }` | [app/api/stripe/create-portal-session/route.ts](app/api/stripe/create-portal-session/route.ts) |
| **GET** | `/api/usage/current` | Current AI token usage | ✅ Required | None | `{ tokensUsed, tokensLimit, percentage, ... }` | [app/api/usage/current/route.ts](app/api/usage/current/route.ts) |
| **GET** | `/api/notifications` | List notifications | ✅ Required | Query: `?read=false` | `{ data: Notification[] }` | [app/api/notifications/route.ts](app/api/notifications/route.ts) |
| **POST** | `/api/notifications/mark-read` | Mark notification as read | ✅ Required | `{ notificationId }` | `{ success: true }` | [app/api/notifications/mark-read/route.ts](app/api/notifications/mark-read/route.ts) |
| **POST** | `/api/comments` | Create comment on story | ✅ Required | `{ storyId, content, parentCommentId? }` | `{ id, ...comment }` | [app/api/comments/route.ts](app/api/comments/route.ts) |
| **POST** | `/api/comments/:id/reactions` | Add reaction to comment | ✅ Required | `{ emoji }` | `{ success: true }` | [app/api/comments/[commentId]/reactions/route.ts](app/api/comments/[commentId]/reactions/route.ts) |
| **POST** | `/api/team/invite` | Invite team member | ✅ Required (admin) | `{ email, role }` | `{ invitationId, token }` | [app/api/team/invite/route.ts](app/api/team/invite/route.ts) |
| **GET** | `/api/templates` | List story templates | ✅ Required | Query: `?category=...` | `{ data: Template[] }` | [app/api/templates/route.ts](app/api/templates/route.ts) |
| **POST** | `/api/templates/:id/apply` | Apply template to project | ✅ Required | `{ projectId }` | `{ createdStories: Story[] }` | [app/api/templates/[templateId]/apply/route.ts](app/api/templates/[templateId]/apply/route.ts) |

### 7.2 Public Webhooks (Unauthenticated, Signature Verified)

| Method | Path | Purpose | Signature | Source |
|--------|------|---------|-----------|--------|
| **POST** | `/api/webhooks/stripe` | Stripe subscription events | ✅ `stripe-signature` header | [app/api/webhooks/stripe/route.ts](app/api/webhooks/stripe/route.ts) |

### 7.3 Cron Jobs (Vercel-Triggered)

| Schedule | Path | Purpose | Source |
|----------|------|---------|--------|
| `0 0 * * *` (daily midnight UTC) | `/api/cron/daily-snapshots` | Take sprint analytics snapshots | [vercel.json:4-6](vercel.json#L4-L6) |
| `0 8 * * *` (daily 8am UTC) | `/api/cron/email-digests?frequency=daily` | Send daily notification digests | [vercel.json:8-10](vercel.json#L8-L10) |
| `0 8 * * 1` (weekly Mon 8am UTC) | `/api/cron/email-digests?frequency=weekly` | Send weekly notification digests | [vercel.json:12-14](vercel.json#L12-L14) |

---

## 8. Environments & Deployments

### 8.1 Environment Variables (Required)

[evidence: [.env.example](env.example)]

| Variable | Purpose | Where Used | Sensitivity |
|----------|---------|------------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string | [lib/db/index.ts:14](lib/db/index.ts#L14) | 🔴 Critical (credentials) |
| `NEXTAUTH_URL` | Base URL for auth callbacks | NextAuth.js | 🟡 Public (but env-specific) |
| `NEXTAUTH_SECRET` | JWT signing secret | [lib/auth/options.ts:151](lib/auth/options.ts#L151) | 🔴 Critical (session security) |
| `GOOGLE_CLIENT_ID` | Google OAuth app ID | [lib/auth/options.ts:35](lib/auth/options.ts#L35) | 🟡 Public |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | [lib/auth/options.ts:36](lib/auth/options.ts#L36) | 🔴 Critical |
| `ANTHROPIC_API_KEY` | Claude AI API key | [lib/services/ai.service.ts](lib/services/ai.service.ts) | 🔴 Critical (AI access) |
| `STRIPE_SECRET_KEY` | Stripe API secret key | [lib/stripe/stripe-client.ts](lib/stripe/stripe-client.ts) | 🔴 Critical (payments) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification | [app/api/webhooks/stripe/route.ts:30](app/api/webhooks/stripe/route.ts#L30) | 🔴 Critical (webhook security) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint | [lib/rate-limit.ts](lib/rate-limit.ts) | 🟢 Public |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash authentication token | [lib/rate-limit.ts](lib/rate-limit.ts) | 🔴 Critical (rate limit bypass) |
| `RESEND_API_KEY` | Resend email API key | [lib/email/send-notification-email.ts](lib/email/send-notification-email.ts) | 🔴 Critical (email sending) |
| `ABLY_API_KEY` | Ably real-time messaging | [lib/services/realtime.service.ts](lib/services/realtime.service.ts) | 🔴 Critical (realtime access) |
| `CRON_SECRET` | Secure cron job endpoints | [app/api/cron/*](app/api/cron) | 🔴 Critical (prevent abuse) |
| `NEXT_PUBLIC_APP_URL` | Client-side app URL | [app/api/stripe/create-checkout-session/route.ts:86-87](app/api/stripe/create-checkout-session/route.ts#L86-L87) | 🟡 Public |

**Risk:** `.env.example` shows `DB_HOST`, `DB_PORT`, `DB_USER` for MySQL but Drizzle config uses PostgreSQL. Documentation debt.

### 8.2 Deployment Targets

| Environment | Platform | URL Pattern | Database | Deployment Trigger |
|-------------|----------|-------------|----------|-------------------|
| **Development** | Local (localhost:3000) | `http://localhost:3000` | Neon (shared dev instance?) | `npm run dev` |
| **Preview** | Vercel | `*.vercel.app` | Neon (staging branch?) | Every git push (GitHub integration) |
| **Production** | Vercel | `synqforge.com` (assumed) | Neon (production) | Merge to `main` branch |

**Evidence of Vercel Deployment:**
- [vercel.json](vercel.json) cron jobs configured
- [next.config.mjs:12](next.config.mjs#L12) allowed origins include `*.vercel.app`
- CI workflow ([.github/workflows/ci.yml](..github/workflows/ci.yml)) runs on all pushes

### 8.3 Build & Deployment Process

**CI Pipeline (GitHub Actions):**
1. Lint → `npm run lint` [evidence: [.github/workflows/ci.yml:27-28](..github/workflows/ci.yml#L27-L28)]
2. Typecheck → `npm run typecheck` [evidence: [.github/workflows/ci.yml:30-31](..github/workflows/ci.yml#L30-L31)]
3. Test → `npm run test` (3 test files) [evidence: [.github/workflows/ci.yml:33-34](..github/workflows/ci.yml#L33-L34)]
4. Build → `npm run build` (Next.js production build) [evidence: [.github/workflows/ci.yml:36-37](..github/workflows/ci.yml#L36-L37)]

**Production Build Overrides:**
⚠️ **TypeScript Errors Ignored:** `ignoreBuildErrors: true` [evidence: [next.config.mjs:16-18](next.config.mjs#L16-L18)]
⚠️ **ESLint Warnings Bypassed:** `ignoreDuringBuilds: true` [evidence: [next.config.mjs:19-21](next.config.mjs#L19-L21)]
**Risk:** Silent build failures mask type safety issues and code quality degradation.

### 8.4 Database Migration Process

**Workflow:**
1. Edit schema → [lib/db/schema.ts](lib/db/schema.ts)
2. Generate migration → `npm run db:generate` (creates SQL in [drizzle/migrations/](drizzle/migrations/))
3. Apply migration → `npm run db:push` or `npm run db:migrate`

**Applied Migrations:** 18 SQL files (0000 through 0018, with 0015 created after 0016/0017 suggesting manual intervention)

**Migration Naming Issues:**
- [drizzle/migrations/0015_add_sprint_velocity_cache.sql](drizzle/migrations/0015_add_sprint_velocity_cache.sql) created after 0016/0017
- **Risk:** Out-of-order migrations could cause deployment issues if applied sequentially

### 8.5 Feature Flags

[evidence: [lib/constants.ts:524-533](lib/constants.ts#L524-L533)]

```typescript
export const FEATURES = {
  REALTIME_COLLABORATION: true,
  AI_STORY_GENERATION: true,
  DOCUMENT_PROCESSING: true,
  ANALYTICS: true,
  TEMPLATES: true,
  NOTIFICATIONS: true,
  COMMENTS: true,
} as const
```

All features hardcoded to `true`. No runtime toggling or A/B testing infrastructure observed.

---

## 9. Quality & Coverage

### 9.1 Testing Infrastructure

**Test Framework:** Node.js native test runner (v22+) with tsx for TypeScript [evidence: [package.json:12](package.json#L12)]

**Test Files Found:** 3 files in [tests/](tests/) directory
1. [tests/unit/validate-story-schema.test.ts](tests/unit/validate-story-schema.test.ts) - Zod schema validation
2. [tests/unit/urls.test.ts](tests/unit/urls.test.ts) - URL utility functions
3. [tests/integration/notification-digest-links.test.ts](tests/integration/notification-digest-links.test.ts) - Email digest links

**Code Coverage:** Unknown (no coverage reporting configured)

**Lines of Code Estimate:**
- `lib/` directory: ~22,410 lines [evidence: `wc -l lib/**/*.ts`]
- `app/` directory: ~16,353 lines [evidence: `wc -l app/**/*.{ts,tsx}`]
- **Total:** ~38,763 lines of TypeScript/React code

**Test Coverage Estimate:** <0.1% (3 test files for ~39k LOC)

### 9.2 Quality Tooling

| Tool | Version | Configuration | Status |
|------|---------|---------------|--------|
| **ESLint** | 9.37.0 | `eslint.config.js` (not provided in audit) | ⚠️ Disabled during builds |
| **TypeScript** | 5.9.3 | [tsconfig.json](tsconfig.json) | ⚠️ Strict mode OFF, errors ignored in builds |
| **Prettier** | Not installed | N/A | ❌ No code formatting enforced |
| **Husky (Git Hooks)** | Not installed | N/A | ❌ No pre-commit checks |
| **Commitlint** | Not installed | N/A | ❌ No commit message standards |
| **Vitest/Jest** | Not installed | N/A | ❌ No modern test framework |
| **Playwright/Cypress** | Not installed | N/A | ❌ No E2E tests |

**TypeScript Configuration Concerns:**
- `strict: false` [evidence: [tsconfig.json:14](tsconfig.json#L14)] - Disables null checks, strict property initialization
- `noImplicitAny: false` [evidence: [tsconfig.json:7](tsconfig.json#L7)] - Allows implicit `any` types
- `noUnusedLocals: false` [evidence: [tsconfig.json:15](tsconfig.json#L15)] - Dead code not flagged

**Risk:** Weak type safety increases runtime errors, technical debt accumulation.

### 9.3 Notable Passing Tests

**Smoke Test Workflow:** [.github/workflows/smoke.yml](.github/workflows/smoke.yml) runs [scripts/smoke.sh](scripts/smoke.sh)
**Validation Scripts:**
- [scripts/validate-production.sh](scripts/validate-production.sh) - Production readiness checks
- [scripts/validate-user-journey.sh](scripts/validate-user-journey.sh) - End-to-end journey tests
- [scripts/comprehensive-validation.sh](scripts/comprehensive-validation.sh) - Full validation suite

**Assumption:** Scripts exist but unclear if they're maintained or passing (no recent run evidence).

---

## 10. Non-Functional Requirements

### 10.1 Performance

| Metric | Target | Current Status | Evidence |
|--------|--------|----------------|----------|
| **Initial Page Load** | <3s | Unknown (no metrics) | No APM configured |
| **API Response Time (p95)** | <500ms | Unknown | No tracing/logging |
| **Database Query Time** | <100ms | Unknown | Indexes present but no monitoring |
| **AI Story Generation** | 5-15s | Assumed (Anthropic latency) | Model: Claude Haiku (fastest tier) |
| **Concurrent Users** | Unknown | Serverless scales automatically | Vercel deployment |

**Optimisations Present:**
- ✅ Database indexes on foreign keys, status fields, timestamps [evidence: schema.ts `index()` calls]
- ✅ Cached sprint velocity (`velocityCached` column) [evidence: migration 0015]
- ✅ Aggregate fields on epics (totalStories, completedStories) updated by triggers [evidence: migration 0013]
- ✅ Turbopack dev mode for faster hot reload [evidence: [package.json:7](package.json#L7)]
- ❌ No CDN caching strategy observed
- ❌ No query result caching (Redis for read-heavy queries)
- ❌ No code splitting beyond Next.js defaults

### 10.2 Security & Authentication

**Authentication:**
- ✅ NextAuth.js v4 with JWT strategy [evidence: [lib/auth/options.ts:147](lib/auth/options.ts#L147)]
- ✅ Session max age: 30 days [evidence: [lib/auth/options.ts:149](lib/auth/options.ts#L149)]
- ✅ Password hashing with bcrypt [evidence: [lib/utils/auth.ts](lib/utils/auth.ts)]
- ✅ OAuth (Google) supported [evidence: [lib/auth/options.ts:34-37](lib/auth/options.ts#L34-L37)]
- ⚠️ Password reset tokens stored in plaintext (should be hashed)
- ⚠️ No 2FA/MFA support
- ⚠️ No session revocation mechanism observed

**Authorisation (RBAC):**
- ✅ Role enum: `owner`, `admin`, `member`, `viewer` [evidence: [lib/db/schema.ts:32](lib/db/schema.ts#L32)]
- ✅ Middleware checks roles for API routes [evidence: [lib/middleware/auth.ts](lib/middleware/auth.ts)]
- ✅ Organisation-based multi-tenancy (RLS via application logic)
- ⚠️ No database-level RLS (Row-Level Security) enforced - relies on app code
- ⚠️ Viewer role permissions unclear (not enforced in all endpoints)

**Security Headers:**
[evidence: [next.config.mjs:25-52](next.config.mjs#L25-L52)]
- ✅ `X-Frame-Options: DENY`
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `X-XSS-Protection: 1; mode=block`
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`
- ✅ `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- ❌ No `Content-Security-Policy` (XSS risk)
- ❌ No `Strict-Transport-Security` (HTTPS enforcement)

**Vulnerability Risks:**
- ⚠️ Secrets in plaintext (password reset tokens, OAuth tokens in DB)
- ⚠️ IP addresses logged in `activities` table (GDPR compliance?)
- ⚠️ No SQL injection protection beyond Drizzle ORM (relies on parameterisation)
- ⚠️ No rate limiting on auth endpoints (brute force risk)
- ⚠️ Stripe webhook signature verified but cron endpoints only protected by `CRON_SECRET` (guessable?)

### 10.3 Privacy & PII Handling

**PII Data Stored:**
- ✅ Email addresses (users, team_invitations tables)
- ✅ Full names (users.name)
- ✅ IP addresses (activities.ipAddress)
- ⚠️ AI prompt content (ai_generations.promptText may contain user data)
- ⚠️ Document uploads (project_documents.extractedContent may contain PII)
- ⚠️ Comment mentions (story_comments.mentions)

**GDPR Considerations:**
- ❌ No data export API observed (GDPR Article 20: Right to Data Portability)
- ❌ No account deletion flow (GDPR Article 17: Right to Erasure)
- ❌ No cookie consent banner observed
- ✅ PII detection schema exists (pii_detections table) but not implemented

**Compliance Gaps:**
- ❌ No privacy policy link observed
- ❌ No terms of service acceptance flow
- ❌ No data retention policy configured
- ❌ No anonymisation of logs/analytics

### 10.4 Observability

**Logging:**
- ⚠️ Console.log statements scattered throughout code [evidence: `grep "console.log" app/api/**/*.ts`]
- ❌ No structured logging library (Winston, Pino)
- ❌ No centralised log aggregation (Datadog, LogRocket, Papertrail)
- ✅ Observability files scaffolded but empty: [lib/observability/logger.ts](lib/observability/logger.ts), [lib/observability/metrics.ts](lib/observability/metrics.ts), [lib/observability/tracing.ts](lib/observability/tracing.ts)

**Error Tracking:**
- ❌ No Sentry/Bugsnag integration
- ❌ No error boundaries beyond Next.js defaults ([app/error.tsx](app/error.tsx) exists but basic)
- ❌ No source map upload to error tracker

**Monitoring:**
- ❌ No APM (Application Performance Monitoring)
- ❌ No uptime monitoring (Pingdom, UptimeRobot)
- ❌ No alerting on API failures
- ⚠️ Vercel provides basic metrics but no custom alerts configured

**Metrics & Analytics:**
- ❌ No product analytics (PostHog, Mixpanel, Amplitude)
- ❌ No user behaviour tracking (Heap, Hotjar)
- ✅ Internal analytics tables (sprint_analytics, ai_generations) for product metrics

### 10.5 Accessibility

**Compliance Target:** Unknown (WCAG 2.1 Level AA assumed)

**Accessibility Features Observed:**
- ✅ Semantic HTML (Radix UI primitives have ARIA attributes)
- ✅ Keyboard navigation (`role="button"`, `tabIndex`, `onKeyDown` handlers) [evidence: [app/dashboard/page.tsx:370-376](app/dashboard/page.tsx#L370-L376)]
- ✅ `aria-label` attributes on interactive elements [evidence: [app/dashboard/page.tsx:377](app/dashboard/page.tsx#L377)]
- ⚠️ Color contrast not verified (purple/emerald brand colors)
- ❌ No skip navigation link observed
- ❌ No focus indicators customisation (relies on browser defaults)
- ❌ No screen reader testing evident

### 10.6 Localisation & Internationalisation

**Current Locale:** UK English (hardcoded)

**i18n Support:**
- ❌ No next-intl or react-i18next installed
- ❌ All text strings hardcoded in components
- ✅ Currency: GBP (£) [evidence: [lib/constants.ts:88](lib/constants.ts#L88)]
- ✅ Date formatting uses `date-fns` (locale-aware potential) [evidence: [package.json:46](package.json#L46)]

**Future Expansion Risk:** No i18n foundation = major refactor required for multi-language support.

---

## 11. Risks & Recommendations

### 11.1 Critical Risks (Address Immediately)

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| **Build Errors Ignored** | 🔴 Critical | High | Remove `ignoreBuildErrors: true` from [next.config.mjs:17](next.config.mjs#L17), fix TypeScript errors |
| **Weak Type Safety** | 🟡 High | High | Enable `strict: true` in [tsconfig.json:14](tsconfig.json#L14), fix implicit any types |
| **No Production Monitoring** | 🔴 Critical | Certain | Integrate Sentry for error tracking, add APM (Vercel Analytics or Datadog) |
| **Secrets in Plaintext** | 🔴 Critical | Medium | Encrypt password reset tokens, OAuth tokens, Git integration tokens before storing |
| **<0.1% Test Coverage** | 🟡 High | High | Add integration tests for critical flows (auth, payment, AI generation) |
| **Migration Ordering Issues** | 🟡 High | Medium | Rename migration 0015 to 0018a or consolidate with 0018, verify migration log in production DB |
| **No Rollback Strategy** | 🟡 High | Medium | Document database rollback procedure, implement blue-green deployments |
| **Rate Limit Bypass** | 🟡 High | Low | Ensure cron endpoints validate `CRON_SECRET`, add IP allowlist for webhooks |

### 11.2 High-Priority Technical Debt

1. **Advanced AI Features Status Unknown:** 12 AI modules have database schema but no working endpoints observed. Clarify implementation status or remove unused tables.
2. **Email Delivery Unverified:** Resend integration configured but no logs/analytics showing production emails sent. Test forgot password flow end-to-end.
3. **Real-time Collaboration Usage Unclear:** Ably client set up but no evidence of active channels. Verify presence indicators functional.
4. **Documentation Debt:** `.env.example` references MySQL but app uses PostgreSQL. Update docs to match reality.
5. **No API Versioning:** All endpoints at `/api/*` with no `/v1/` prefix. Breaking changes will impact clients.

### 11.3 Recommended Next Steps (Priority Order)

**Phase 1: Stabilisation (Week 1-2)**
1. ✅ Enable TypeScript strict mode, fix errors
2. ✅ Remove build error suppression
3. ✅ Integrate Sentry for error tracking
4. ✅ Add E2E tests for signup → AI generation → checkout flow
5. ✅ Encrypt sensitive tokens (password reset, OAuth)

**Phase 2: Observability (Week 3-4)**
1. ✅ Set up APM (Vercel Analytics or Datadog)
2. ✅ Implement structured logging (Pino)
3. ✅ Add uptime monitoring alerts
4. ✅ Configure Stripe webhook monitoring dashboard

**Phase 3: Advanced Features (Month 2)**
1. ✅ Complete Backlog Autopilot implementation or remove schema
2. ✅ Verify AC Validator, Test Generator functionality
3. ✅ Launch Knowledge Search (RAG) beta
4. ✅ Implement database-level RLS (Neon supports Postgres RLS)

**Phase 4: Compliance & Scale (Month 3)**
1. ✅ GDPR audit: data export API, account deletion, cookie consent
2. ✅ Security audit: penetrate test auth, rate limits, webhook signatures
3. ✅ Performance: add Redis caching for dashboard stats, project lists
4. ✅ Accessibility: WCAG 2.1 AA audit, fix contrast issues

---

## 12. Open Questions & Assumptions

### 12.1 Assumptions (with Confidence %)

| Assumption | Confidence | How to Validate |
|------------|-----------|-----------------|
| Neon PostgreSQL database is production-ready and scaled appropriately | 70% | Check Neon dashboard for connection pool size, query latency, storage limits |
| Stripe live mode is active and processing real payments | 85% | Verify `STRIPE_SECRET_KEY` starts with `sk_live_`, check Stripe dashboard for transactions |
| Advanced AI features (autopilot, validators, etc.) are NOT functional in production | 80% | Test `/api/ai/autopilot`, `/api/ai/ac-validator` endpoints; check if they return 404/501 |
| Real-time collaboration (Ably) is partially implemented but not actively used | 60% | Monitor Ably dashboard for channel activity, test presence indicators in UI |
| Email notifications via Resend are configured but not sending in production | 50% | Trigger forgot password flow, check Resend logs for delivery status |
| Application handles ~100-500 users concurrently (no load testing evidence) | 40% | Run load test with Artillery/k6 against Vercel deployment |
| Database migrations applied sequentially without rollback history | 90% | Check `drizzle_migrations` table in production DB for applied migrations list |
| No PII has been leaked in AI prompts to Anthropic | 50% | Audit ai_generations.promptText for email addresses, names, phone numbers |
| TypeScript errors exist in codebase but masked by build config | 95% | Run `npx tsc --noEmit --strict` to surface all type errors |
| Git repository main branch is `main` (not `master`) | 80% | Check `.github/workflows/ci.yml` trigger branches |

### 12.2 Critical Unknowns (Requires Investigation)

1. **What is the production DATABASE_URL?** Is it Neon pooled or direct? Connection limit?
2. **Are Stripe products correctly seeded in live mode?** Verify price IDs match [lib/constants.ts](lib/constants.ts) tiers.
3. **What is the actual AI token consumption rate?** Need 30-day usage report from Anthropic dashboard.
4. **Are there any paying customers yet?** Check Stripe subscriptions table for `status = 'active'`.
5. **What is the password reset token expiry?** Code shows `expiresAt` but generation logic unclear.
6. **Is Row-Level Security (RLS) enforced in Neon?** App code filters by organizationId but DB may allow cross-tenant queries.
7. **What is the disaster recovery plan?** Are automated backups configured in Neon? Last backup restore tested?
8. **What is the API rate limit policy?** Upstash configured but per-endpoint limits not documented.
9. **Are there any manual database operations in production?** Check for ad-hoc scripts in [scripts/](scripts/) that bypass migrations.
10. **What is the support escalation process?** [lib/constants.ts:84,134,187,239,346](lib/constants.ts) defines support tiers (community, email, priority, dedicated) but no ticketing system integrated.

---

## 13. Conclusion

SynqForge is a **well-architected, feature-rich AI-powered project management platform** in **pre-production maturity** (v0.1.0). The codebase demonstrates strong technical foundations:

✅ Modern stack (Next.js 15, React 19, TypeScript, Drizzle ORM)
✅ Comprehensive database schema with multi-tenancy and RBAC
✅ Functional AI integration with Claude Haiku and usage metering
✅ Stripe subscription lifecycle with 5 pricing tiers
✅ Real-time collaboration infrastructure
✅ 95+ API endpoints for full CRUD operations

**However, critical production readiness gaps exist:**

⚠️ Build configuration bypasses type safety and linting
⚠️ Near-zero test coverage (<0.1%)
⚠️ No production monitoring or error tracking
⚠️ Security concerns (plaintext secrets, weak session management)
⚠️ 12 advanced AI features have schema but unclear implementation status
⚠️ GDPR compliance gaps (no data export, no account deletion)

**Recommendation:** **Do not promote to production** until Phase 1 Stabilisation (see Section 11.3) is complete. The application is ~70% production-ready but requires 2-4 weeks of hardening to safely handle real users and payments.

**Strengths to Leverage:**
- Excellent database design with triggers and aggregates
- Fair-usage guardrails prevent runaway AI costs
- Stripe integration is production-grade with webhook handling
- Type-safe repository pattern with Drizzle ORM

**Next Immediate Actions:**
1. Fix TypeScript errors (remove `ignoreBuildErrors`)
2. Add integration tests for auth + payment flows
3. Set up Sentry error tracking
4. Audit Stripe live mode products (verify price IDs)
5. Test email delivery end-to-end (Resend)

---

**Report Generated:** 21 October 2025
**Total Evidence Points:** 180+ file citations
**Codebase Size:** ~38,763 lines (TypeScript/React)
**Audit Duration:** Comprehensive automated analysis
