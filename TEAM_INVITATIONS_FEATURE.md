# Team Member Invitation Feature

## Overview
A comprehensive team member invitation system with subscription-based limits and full user journey implementation.

## Features Implemented

### 1. Database Schema
- **New Table**: `team_invitations`
  - Tracks invitation status (pending, accepted, rejected, expired)
  - Stores invitation tokens for secure acceptance
  - Tracks inviter information
  - Includes expiration timestamps (7 days)

- **New Enum**: `invitation_status`
  - `pending`: Invitation sent, awaiting response
  - `accepted`: User has accepted and joined
  - `rejected`: User declined the invitation
  - `expired`: Invitation passed expiration date

### 2. API Endpoints

#### `/api/team` (GET)
- Fetches all team members in the user's organization
- Returns member details including role, status, and activity

#### `/api/team/invite` (POST)
- Creates a new invitation
- **Validation**:
  - Email format validation
  - Role validation (admin, member, viewer)
  - Checks subscription limits
  - Prevents duplicate invitations
  - Prevents inviting existing members
- **Authorization**: Only admins can invite
- **Response**: Returns invitation details and invite link

#### `/api/team/invite` (GET)
- Retrieves all invitations for the organization
- **Authorization**: Only admins can view

#### `/api/team/invite/[invitationId]` (DELETE)
- Revokes/cancels a pending invitation
- **Authorization**: Only admins can revoke

#### `/api/team/limits` (GET)
- Returns current team size and subscription limits
- Calculates remaining slots
- Indicates if upgrade is required

### 3. Subscription Limits

#### Free Tier
- **Max Users**: 1
- **Monthly AI Tokens**: 10,000
- **Features**: Basic functionality only

#### Pro Tier
- **Max Users**: 10
- **Monthly AI Tokens**: 500,000
- **Features**: Full feature access (no SSO)

#### Enterprise Tier
- **Max Users**: Unlimited (∞)
- **Monthly AI Tokens**: Unlimited
- **Features**: All features including SSO

### 4. UI Components

#### Team Page (`/app/team/page.tsx`)
- **Two Tabs**:
  1. **Members**: Shows all active team members
  2. **Pending Invitations**: Shows all pending invitations
- **Features**:
  - Search functionality for both members and invitations
  - Real-time user count display
  - Visual limit indicators
  - Member role badges
  - Active status indicators
  - Invitation management (revoke)

#### Invite Member Modal (`components/invite-member-modal.tsx`)
- **Plan Validation**:
  - Shows current team size vs. limit
  - Visual progress bar for limit tracking
  - Prevents invitation if limit reached
  - Upgrade prompt with link to pricing
- **Form Fields**:
  - Email input with validation
  - Role selection (Admin/Member/Viewer)
  - Clear error messaging
- **Success Flow**:
  - Confirmation message
  - Optional invite link for sharing
  - Auto-refresh team data

#### Team Limits Badge (`components/team-limits-badge.tsx`)
- Displays current user count
- Shows subscription tier
- Warning when approaching limit
- Upgrade button when at limit
- Real-time updates

### 5. User Journeys

#### Journey 1: Admin Invites New Member (Within Limit)
1. Admin clicks "Invite Member" button
2. Modal opens showing current team limits
3. Admin enters email and selects role
4. System validates subscription allows more users
5. Invitation created and sent
6. Admin sees success message
7. Invitation appears in "Pending Invitations" tab
8. Team counter updates

#### Journey 2: Admin Tries to Invite When At Limit
1. Admin clicks "Invite Member" button
2. Modal shows limit warning (e.g., "5/5 users")
3. Upgrade prompt displays
4. If admin tries to submit:
   - Error message: "User limit reached"
   - Link to pricing page
5. Invitation blocked

#### Journey 3: Admin Revokes Invitation
1. Admin navigates to "Pending Invitations" tab
2. Finds invitation to revoke
3. Clicks trash icon
4. Confirms action
5. Invitation removed from list
6. Slot becomes available again

#### Journey 4: Viewing Team Limits
1. User navigates to Team page
2. Sees badge: "X / Y users" (or "X users" if unlimited)
3. Progress bar shows usage if limited
4. If near limit (≥80%): Warning displayed
5. If at limit: "Upgrade Plan" button shown

#### Journey 5: Non-Admin User
1. Non-admin member views Team page
2. Sees all team members
3. "Invite Member" button disabled or hidden
4. Cannot access invitation management
5. API calls return 403 Forbidden

### 6. Security Features

- **Authentication**: All endpoints require valid session
- **Authorization**: Invitation management restricted to admins
- **Validation**:
  - Email format checking
  - Role whitelisting
  - Token uniqueness
  - Organization isolation
- **Rate Limiting**: Standard API rate limits apply
- **Token Security**: Cryptographically secure random tokens

### 7. Edge Cases Handled

1. **Duplicate Emails**: Prevents inviting same email twice
2. **Existing Members**: Blocks inviting current members
3. **Expired Invitations**: Status tracked, can be cleaned up
4. **Concurrent Invitations**: Database constraints prevent conflicts
5. **Plan Changes**: Limits checked in real-time
6. **Invalid Roles**: Role validation on server side
7. **Missing Organization**: Proper error handling

## Database Migration

**File**: `drizzle/migrations/0008_add_team_invitations.sql`

To apply the migration:
```bash
npx drizzle-kit push
```

Or with environment variable:
```bash
DATABASE_URL="your-connection-string" npx drizzle-kit push
```

## Configuration

### Environment Variables
- `NEXT_PUBLIC_APP_URL`: Base URL for invitation links (default: http://localhost:3000)
- `DATABASE_URL`: PostgreSQL connection string

### Subscription Limits
Defined in: `lib/constants.ts`
- Can be adjusted per tier
- Applied via `lib/middleware/subscription.ts`

## Future Enhancements

1. **Email Notifications**
   - Send actual invitation emails
   - Email templates with branding
   - Reminder emails for pending invitations

2. **Invitation Acceptance Flow**
   - Public page to accept invitations
   - Account creation if user doesn't exist
   - Auto-join if user exists

3. **Advanced Features**
   - Bulk invitations
   - Invitation templates
   - Custom expiration periods
   - Resend invitation
   - Team member removal
   - Role modification

4. **Analytics**
   - Track invitation acceptance rate
   - Time to accept metrics
   - Most common roles invited

## Testing Checklist

- [ ] Create invitation as admin (within limit)
- [ ] Create invitation as admin (at limit) - should fail
- [ ] Create invitation as non-admin - should fail
- [ ] Revoke pending invitation
- [ ] Search team members
- [ ] Search invitations
- [ ] View team limits on different plans
- [ ] Verify counter updates after invitation
- [ ] Check modal validation (invalid email, etc.)
- [ ] Test with Free tier (1 user limit)
- [ ] Test with Pro tier (10 user limit)
- [ ] Test with Enterprise tier (unlimited)
- [ ] Verify API authorization
- [ ] Check database constraints

## API Response Examples

### Successful Invitation
```json
{
  "message": "Invitation sent successfully",
  "invitation": {
    "id": "uuid",
    "email": "newmember@example.com",
    "role": "member",
    "expiresAt": "2025-10-21T12:00:00Z",
    "inviteLink": "http://localhost:3000/invite/accept?token=..."
  },
  "organizationName": "Acme Corp"
}
```

### Limit Reached
```json
{
  "error": "User limit reached",
  "message": "Your plan allows 10 users. You currently have 10 users.",
  "currentCount": 10,
  "maxUsers": 10,
  "upgradeUrl": "/pricing"
}
```

### Team Limits
```json
{
  "currentCount": 5,
  "maxUsers": 10,
  "remainingSlots": 5,
  "canAddMore": true,
  "subscriptionTier": "Pro",
  "upgradeRequired": false
}
```

## Files Created/Modified

### New Files
- `/app/api/team/route.ts`
- `/app/api/team/invite/route.ts`
- `/app/api/team/invite/[invitationId]/route.ts`
- `/app/api/team/limits/route.ts`
- `/components/invite-member-modal.tsx`
- `/components/team-limits-badge.tsx`
- `/drizzle/migrations/0008_add_team_invitations.sql`

### Modified Files
- `/lib/db/schema.ts` - Added team_invitations table and relations
- `/app/team/page.tsx` - Complete rewrite with full functionality
- `/lib/middleware/subscription.ts` - Already had team limit functions
- `/lib/constants.ts` - Already had SUBSCRIPTION_LIMITS defined

## Notes

- Invitation acceptance flow not yet implemented (would require public page)
- Email sending not yet implemented (would require email service like Resend or SendGrid)
- Team member removal not yet implemented
- Role modification for existing members not yet implemented
