# Client Story Review Assistant - Complete Feature Documentation

## Overview

The Client Story Review Assistant enables non-technical clients to review, understand, and approve/reject user stories through a dedicated client portal. Stories are automatically translated into business-friendly language using AI, making them accessible to stakeholders without technical expertise.

## Feature Highlights

- **AI-Powered Translation**: Technical stories are automatically converted to plain business language
- **Risk Identification**: AI identifies and highlights potential risks (technical, business, timeline, resource)
- **Structured Feedback**: Clients can provide categorized feedback (concerns, questions, suggestions, blockers)
- **Approval Workflow**: Full approve/needs-revision/reject workflow with notes
- **Q&A System**: Clients can ask clarifying questions that the team answers
- **Audit Trail**: Complete activity logging for all review actions
- **Email Notifications**: Automated notifications for all key events
- **Secure Token-based Access**: Time-limited portal access without requiring client accounts

---

## Architecture

### Database Schema

**Table: `client_story_reviews`**

```sql
CREATE TABLE client_story_reviews (
  id VARCHAR(36) PRIMARY KEY,
  story_id VARCHAR(36) NOT NULL REFERENCES stories(id),
  client_id VARCHAR(36) NOT NULL REFERENCES clients(id),
  project_id VARCHAR(36) NOT NULL REFERENCES projects(id),
  organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id),
  
  -- Business-friendly translation
  business_summary TEXT,
  business_value TEXT,
  expected_outcome TEXT,
  identified_risks JSONB DEFAULT '[]'::jsonb,
  clarifying_questions JSONB DEFAULT '[]'::jsonb,
  
  -- Approval workflow
  approval_status review_status DEFAULT 'pending' NOT NULL,
  approval_notes TEXT,
  approved_by_role VARCHAR(50),
  approved_by_email VARCHAR(255),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Feedback tracking
  feedback_items JSONB DEFAULT '[]'::jsonb,
  feedback_summary TEXT,
  
  -- AI-generated insights
  ai_generated_summary BOOLEAN DEFAULT FALSE,
  technical_complexity_score SMALLINT,
  client_friendliness_score SMALLINT,
  
  -- Timestamps
  submitted_for_review_at TIMESTAMP WITH TIME ZONE,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  review_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by VARCHAR(36) NOT NULL REFERENCES users(id),
  
  CONSTRAINT unique_story_client_review UNIQUE (story_id, client_id)
);
```

### Service Layer

**`ClientStoryReviewService`** (`lib/services/client-story-review.service.ts`)

Core service handling all review operations:
- `submitStoryForReview()` - Submit story with AI translation
- `getReview()` - Retrieve review by ID
- `getClientReviews()` - List all reviews for a client
- `getStoryReviews()` - Get all reviews for a specific story
- `updateApprovalStatus()` - Update approval decision
- `addFeedbackItem()` - Add structured feedback
- `addClarifyingQuestion()` - Client asks a question
- `answerClarifyingQuestion()` - Team answers question
- `trackViewed()` - Track when review is viewed
- `getClientReviewStats()` - Get review statistics

**`ClientReviewNotificationsService`** (`lib/services/client-review-notifications.service.ts`)

Handles notifications and activity logging:
- `logActivity()` - Log to activities table
- `notifyStorySubmittedForReview()` - Email team on submission
- `notifyClientFeedbackReceived()` - Email team on feedback
- `notifyClientQuestionAsked()` - Email team on question
- `notifyClientReviewDecision()` - Email team on approval/rejection
- `notifyClientQuestionAnswered()` - Email client when answered

### API Endpoints

All endpoints use token-based authentication via `Authorization: Bearer <token>` header.

#### Submit Story for Review
```http
POST /api/client-portal/[clientId]/reviews
Content-Type: application/json

{
  "storyId": "story-id",
  "submittedBy": "user-id",
  "organizationId": "org-id"
}
```

#### List Reviews
```http
GET /api/client-portal/[clientId]/reviews?organizationId=org-id
Authorization: Bearer <token>
```

#### Get Specific Review
```http
GET /api/client-portal/[clientId]/reviews/[reviewId]
Authorization: Bearer <token>
```

#### Update Approval Status
```http
PATCH /api/client-portal/[clientId]/reviews/[reviewId]
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "approved" | "needs_revision" | "rejected",
  "approvedByEmail": "client@example.com",
  "approvedByRole": "client_stakeholder",
  "notes": "Optional notes"
}
```

#### Add Feedback
```http
POST /api/client-portal/[clientId]/reviews/[reviewId]/feedback
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "concern" | "question" | "suggestion" | "blocker",
  "description": "Feedback description",
  "priority": "low" | "medium" | "high"
}
```

#### Ask Question
```http
POST /api/client-portal/[clientId]/reviews/[reviewId]/questions
Authorization: Bearer <token>
Content-Type: application/json

{
  "question": "What happens if...?"
}
```

#### Answer Question (Team Only)
```http
PATCH /api/client-portal/[clientId]/reviews/[reviewId]/questions/[index]
Content-Type: application/json

{
  "answer": "The answer is..."
}
```

---

## Frontend Components

### Client Portal Landing Page
**Location**: `app/client-portal/[token]/page.tsx`

Features:
- Statistics dashboard (total, pending, approved, needs revision, rejected)
- List of all reviews with filtering
- Visual status indicators
- Click-through to individual reviews

### Review Detail Page
**Location**: `app/client-portal/[token]/reviews/[reviewId]/page.tsx`

Features:
- Business-friendly story summary
- Business value and expected outcome
- Acceptance criteria (plain language)
- Complexity assessment with visual indicators
- Identified risks with severity levels
- Feedback history
- Q&A section with answers
- Add feedback form
- Ask question form
- Approval decision form (Approve/Revise/Reject)

---

## User Workflows

### Workflow 1: Team Submits Story for Review

1. **Team Member Actions**:
   ```typescript
   const reviewService = new ClientStoryReviewService()
   const review = await reviewService.submitStoryForReview(
     storyId,
     clientId,
     organizationId,
     userId
   )
   ```

2. **System Actions**:
   - Fetches the story from database
   - Calls AI to translate story to business language
   - Identifies technical/business risks
   - Calculates complexity scores
   - Creates review record with `pending` status
   - Logs activity to audit trail
   - (Optional) Sends email notification to team

3. **Client Receives**:
   - Email notification (if configured)
   - Access via portal token to view review

### Workflow 2: Client Reviews Story

1. **Client Access**:
   - Receives portal link: `https://app.synqforge.com/client-portal/[token]`
   - Token validated on access
   - Views list of pending reviews

2. **Client Actions**:
   - Clicks on story to view details
   - Reads business summary, value, and outcomes
   - Reviews identified risks
   - Optionally adds feedback items
   - Optionally asks clarifying questions
   - Makes decision: Approve / Needs Revision / Reject

3. **System Actions**:
   - Updates review status
   - Logs activity
   - Sends notification to team
   - Records approval timestamp and approver details

### Workflow 3: Team Responds to Questions

1. **Team Receives**:
   - Email notification of new question
   - Link to story/review in main app

2. **Team Actions**:
   ```typescript
   await reviewService.answerClarifyingQuestion(
     reviewId,
     questionIndex,
     "Here's the answer..."
   )
   ```

3. **System Actions**:
   - Updates question with answer and timestamp
   - Logs activity
   - Sends email to client with answer

---

## AI Translation System

### Translation Process

When a story is submitted for review, the AI:

1. **Analyzes** the technical story details:
   - Title
   - Description
   - Acceptance Criteria
   - Story Points

2. **Generates** business-friendly content:
   - **Business Summary**: 2-3 sentence plain English summary
   - **Business Value**: Clear explanation of benefits
   - **Expected Outcome**: What client will see/experience
   - **Identified Risks**: Array of categorized risks with severity
   - **Complexity Scores**:
     - Technical Complexity (0-10)
     - Client Friendliness (0-10)

3. **Example Output**:
   ```json
   {
     "businessSummary": "This feature will add a secure login system where users can sign in using their email and password. It includes protection against unauthorized access and a way to recover forgotten passwords.",
     "businessValue": "Customers will have their own personal accounts, making it safe to store their information and preferences. This builds trust and allows for personalized experiences.",
     "expectedOutcome": "Users will see a clean login page, receive confirmation emails, and be able to reset their password if forgotten. The system will remember their preferences when they return.",
     "identifiedRisks": [
       {
         "category": "technical",
         "description": "Password encryption and storage requires careful implementation to meet security standards",
         "severity": "high"
       },
       {
         "category": "timeline",
         "description": "Implementing two-factor authentication may extend the timeline by 1-2 sprints",
         "severity": "medium"
       }
     ],
     "technicalComplexityScore": 7,
     "clientFriendlinessScore": 8
   }
   ```

### AI Model Configuration

- **Model**: Qwen 3 Max via OpenRouter
- **Temperature**: 0.3 (for consistent, factual output)
- **Response Format**: JSON object
- **Fallback**: If AI fails, returns basic story details

---

## Security & Access Control

### Token-Based Authentication

- Portal access uses secure, time-limited tokens
- Tokens stored in `client_portal_access` table
- Default expiry: 30 days
- Tokens validated on every request
- No user account required for clients

### Token Generation

```typescript
const portalService = new ClientPortalService(organizationId)
const { token, portalUrl } = await portalService.sendPortalInvite(
  clientId,
  clientEmail,
  30 // days
)
```

### Access Validation

```typescript
const validation = await portalService.validatePortalToken(token)
// Returns: { valid: boolean, clientId: string, email: string }
```

### Permissions

- Clients can only access reviews for their assigned projects
- Clients can only view/act on reviews linked to their `clientId`
- Team members require authentication to answer questions
- All actions are logged for audit trail

---

## Notifications & Emails

### Email Templates

All emails use Resend API and follow a consistent format:

1. **Story Submitted for Review**
   - Recipients: Team members
   - Trigger: When story submitted for client review
   - Content: Story title, project, client name, link to story

2. **Client Feedback Received**
   - Recipients: Team members
   - Trigger: Client adds feedback
   - Content: Feedback type, priority, story link

3. **Client Question Asked**
   - Recipients: Team members
   - Trigger: Client asks question
   - Content: Question text, story link, answer prompt

4. **Client Decision Made**
   - Recipients: Team members
   - Trigger: Client approves/rejects/requests revision
   - Content: Decision, notes, approver email, story link

5. **Question Answered**
   - Recipients: Client
   - Trigger: Team answers question
   - Content: Original question, answer, review link

### Email Configuration

Required environment variables:
```env
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=SynqForge <notifications@synqforge.app>
NEXT_PUBLIC_APP_URL=https://your-app.com
```

---

## Testing Guide

### Manual Testing Checklist

#### Setup
- [ ] Run database migration: `npm run db:migrate`
- [ ] Verify `client_story_reviews` table exists
- [ ] Create test client via `/clients` page
- [ ] Create test project assigned to client
- [ ] Create test story in that project

#### Submit Story for Review
- [ ] Navigate to story detail page
- [ ] Find "Submit for Client Review" button
- [ ] Select client and submit
- [ ] Verify AI translation appears
- [ ] Check database for review record
- [ ] Check activities table for log entry

#### Client Portal Access
- [ ] Generate portal token via API or UI
- [ ] Access portal URL: `/client-portal/[token]`
- [ ] Verify landing page shows reviews
- [ ] Check statistics are correct
- [ ] Click on review to view details

#### Review Detail Page
- [ ] Verify business summary displays
- [ ] Check complexity scores render
- [ ] Confirm risks are listed with severity
- [ ] Verify acceptance criteria show

#### Add Feedback
- [ ] Select feedback type
- [ ] Enter description
- [ ] Choose priority
- [ ] Submit feedback
- [ ] Verify feedback appears in history

#### Ask Question
- [ ] Enter question text
- [ ] Submit question
- [ ] Verify question appears in Q&A section
- [ ] Check activities log

#### Answer Question (Team)
- [ ] Use API to answer question
- [ ] Verify answer displays in portal
- [ ] Check client notification sent

#### Approval Workflow
- [ ] Enter approver email
- [ ] Select role
- [ ] Choose decision (Approve/Revise/Reject)
- [ ] Add notes
- [ ] Submit decision
- [ ] Verify status updates
- [ ] Check notification sent to team

### API Testing

```bash
# 1. Submit story for review
curl -X POST http://localhost:3000/api/client-portal/[clientId]/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "storyId": "story-123",
    "submittedBy": "user-456",
    "organizationId": "org-789"
  }'

# 2. List reviews
curl -X GET "http://localhost:3000/api/client-portal/[clientId]/reviews?organizationId=org-789" \
  -H "Authorization: Bearer <token>"

# 3. Get specific review
curl -X GET http://localhost:3000/api/client-portal/[clientId]/reviews/[reviewId] \
  -H "Authorization: Bearer <token>"

# 4. Add feedback
curl -X POST http://localhost:3000/api/client-portal/[clientId]/reviews/[reviewId]/feedback \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "concern",
    "description": "This might impact our timeline",
    "priority": "high"
  }'

# 5. Ask question
curl -X POST http://localhost:3000/api/client-portal/[clientId]/reviews/[reviewId]/questions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How long will this take to implement?"
  }'

# 6. Update approval status
curl -X PATCH http://localhost:3000/api/client-portal/[clientId]/reviews/[reviewId] \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "approvedByEmail": "client@example.com",
    "approvedByRole": "client_stakeholder",
    "notes": "Looks good to proceed"
  }'
```

---

## Configuration

### Environment Variables

```env
# AI Translation
OPENROUTER_API_KEY=sk-or-v1-xxx

# Email Notifications
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=SynqForge <notifications@synqforge.app>

# App URL
NEXT_PUBLIC_APP_URL=https://your-app.com

# Database
DATABASE_URL=postgresql://...
```

### Feature Flags

Currently, notifications are optional and degrade gracefully if:
- `RESEND_API_KEY` is not set
- Email sending fails

### AI Model Settings

Configured in `lib/services/client-story-review.service.ts`:
- Model: `qwen/qwen3-max` (via OpenRouter)
- Temperature: `0.3`
- Response Format: `json_object`

---

## Troubleshooting

### Common Issues

**Issue**: AI translation fails
- **Check**: OPENROUTER_API_KEY is set
- **Check**: OpenRouter account has credits
- **Fallback**: System uses basic story details

**Issue**: Email notifications not sending
- **Check**: RESEND_API_KEY is configured
- **Check**: RESEND_FROM_EMAIL is verified domain
- **Impact**: Feature works without emails

**Issue**: Portal token invalid
- **Check**: Token hasn't expired
- **Check**: Token exists in `client_portal_access` table
- **Solution**: Generate new token

**Issue**: Reviews not showing in portal
- **Check**: organizationId parameter is correct
- **Check**: Client has reviews with pending/approved status
- **Check**: Token belongs to correct client

### Debug Logging

Enable detailed logging:
```typescript
import { logger } from '@/lib/utils/logger'

logger.info('Review submitted', { reviewId, storyId })
logger.error('AI translation failed', { error, storyId })
```

---

## Future Enhancements

### Planned Features

1. **Bulk Review Submission**: Submit multiple stories at once
2. **Review Templates**: Predefined review workflows
3. **Custom Branding**: Client-specific portal styling
4. **Approval Rules**: Require multiple approvers
5. **Review Deadlines**: Set review due dates with reminders
6. **Integration**: Sync approval status back to story
7. **Analytics**: Review time metrics and approval rates
8. **Mobile App**: Native mobile client portal
9. **Internationalization**: Multi-language support
10. **Video Comments**: Embed video feedback from clients

### API Extensibility

The service layer is designed for easy extension:
- Add custom fields to review schema
- Implement custom notification channels (Slack, Teams)
- Extend AI prompts for domain-specific translations
- Add custom approval workflows

---

## Support & Maintenance

### Monitoring

Key metrics to track:
- Review submission rate
- Average time to approval
- AI translation success rate
- Email delivery rate
- Token expiration issues

### Database Maintenance

```sql
-- Clean up expired tokens
DELETE FROM client_portal_access WHERE expires_at < NOW();

-- Find stale reviews (pending > 30 days)
SELECT * FROM client_story_reviews 
WHERE approval_status = 'pending' 
AND submitted_for_review_at < NOW() - INTERVAL '30 days';

-- Review statistics
SELECT 
  approval_status,
  COUNT(*) as count,
  AVG(technical_complexity_score) as avg_complexity
FROM client_story_reviews
GROUP BY approval_status;
```

---

## License & Credits

Part of SynqForge platform.
- AI Translation: OpenRouter (Qwen 3 Max)
- Email Service: Resend
- UI Components: Radix UI + shadcn/ui
