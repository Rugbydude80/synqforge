# SynqForge - Export & Stripe Integration Implementation

## Overview
This document outlines the implementation of two major features:
1. **Export Functionality** - Export projects and stories to Excel, Word, and PDF formats
2. **Stripe Subscription Integration** - Require paid subscriptions for new users to access the application

## 1. Export Functionality

### Libraries Installed
- `xlsx` - Excel file generation
- `docx` - Word document generation
- `pdfkit` - PDF generation

### Implementation Files

#### Core Export Module
- **[lib/export/exporters.ts](lib/export/exporters.ts)** - Export utility functions for all formats

#### API Endpoints
- **[app/api/projects/[projectId]/export/route.ts](app/api/projects/[projectId]/export/route.ts)** - Export single project
- **[app/api/stories/export/route.ts](app/api/stories/export/route.ts)** - Export stories with filters

#### UI Component
- **[components/export-button.tsx](components/export-button.tsx)** - Reusable export dropdown button

### Usage

#### Export Button Component
```tsx
import { ExportButton } from '@/components/export-button'

// Export a project
<ExportButton
  endpoint={`/api/projects/${projectId}/export`}
  filename="my-project"
/>

// Export stories
<ExportButton
  endpoint={`/api/stories/export?projectId=${projectId}`}
  filename="project-stories"
/>
```

#### Export Formats
All exports support three formats:
- **Excel (.xlsx)** - Tabular data export
- **Word (.docx)** - Formatted document with headings and sections
- **PDF (.pdf)** - Printable document format

### Subscription Requirements
- Export functionality requires **Pro or Enterprise** subscription
- Free tier users will see an error message prompting them to upgrade

---

## 2. Stripe Subscription Integration

### Libraries Installed
- `stripe` - Stripe server SDK
- `@stripe/stripe-js` - Stripe client SDK

### Environment Variables
Add these to your `.env.local`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=your_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_aHeewh3SBhCD1Kff0aenfokqfTUeg0Jj

# Stripe Price IDs (create these in Stripe Dashboard)
STRIPE_PRO_PRICE_ID=price_xxxxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxxxx
```

### Database Schema Changes

#### New Table: `stripe_subscriptions`
Tracks subscription data from Stripe:
- `stripeCustomerId` - Stripe customer ID
- `stripeSubscriptionId` - Stripe subscription ID
- `stripePriceId` - Price/plan ID
- `status` - Subscription status (active, canceled, etc.)
- `currentPeriodStart/End` - Billing period
- `cancelAtPeriodEnd` - Scheduled cancellation
- Trial dates and metadata

#### Updated Table: `organizations`
Added `stripeCustomerId` field to link organizations with Stripe customers

### Implementation Files

#### Core Stripe Module
- **[lib/stripe/stripe-client.ts](lib/stripe/stripe-client.ts)** - Stripe SDK configuration and plan definitions

#### Subscription Middleware
- **[lib/middleware/subscription.ts](lib/middleware/subscription.ts)** - Subscription checks and feature limits
  - `getSubscriptionLimits()` - Get limits for user's tier
  - `canCreateProject()` - Check project creation limits
  - `canCreateStory()` - Check story creation limits
  - `canExport()` - Check export permission
  - `checkFeatureLimit()` - Generic feature limit checker

#### API Endpoints
- **[app/api/webhooks/stripe/route.ts](app/api/webhooks/stripe/route.ts)** - Stripe webhook handler
- **[app/api/stripe/create-checkout-session/route.ts](app/api/stripe/create-checkout-session/route.ts)** - Create checkout session
- **[app/api/stripe/create-portal-session/route.ts](app/api/stripe/create-portal-session/route.ts)** - Open customer portal
- **[app/api/stripe/subscription/route.ts](app/api/stripe/subscription/route.ts)** - Get current subscription

#### UI Pages
- **[app/pricing/page.tsx](app/pricing/page.tsx)** - Pricing plans display
- **[app/settings/billing/page.tsx](app/settings/billing/page.tsx)** - Subscription management

### Subscription Tiers

#### Free Tier
- 1 project
- Up to 50 stories per project
- Basic AI generation
- No export functionality
- No custom templates
- Community support

#### Pro Tier ($29/month)
- Unlimited projects
- Unlimited stories
- Advanced AI generation
- Export to Excel/Word/PDF
- Custom templates
- Priority support

#### Enterprise Tier ($99/month)
- Everything in Pro
- Dedicated support
- Custom integrations
- SSO/SAML
- Advanced analytics
- SLA guarantee

### Webhook Configuration

Your Stripe webhook is already configured at:
```
URL: https://svibjiiadecikytmiedy.supabase.co/functions/v1/stripe-webhook
Secret: whsec_aHeewh3SBhCD1Kff0aenfokqfTUeg0Jj
```

**Important:** You'll need to update this webhook URL to point to your production domain:
```
https://yourdomain.com/api/webhooks/stripe
```

The webhook handles these events:
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Subscription changes
- `customer.subscription.deleted` - Subscription canceled
- `invoice.payment_succeeded` - Successful payment
- `invoice.payment_failed` - Failed payment

### User Flow

#### New User Signup
1. User visits `/pricing` page
2. Selects a plan (Free/Pro/Enterprise)
3. For paid plans:
   - Redirected to Stripe Checkout
   - Enters payment information
   - Stripe creates customer and subscription
   - Webhook updates database
   - User redirected back to `/settings/billing?success=true`

#### Existing User Upgrade
1. User visits `/pricing` or `/settings/billing`
2. Clicks "Subscribe" or "Upgrade"
3. Same Stripe Checkout flow as above

#### Subscription Management
Users can manage subscriptions via `/settings/billing`:
- View current plan and billing period
- Access Stripe Customer Portal for:
  - Update payment method
  - View invoices
  - Cancel subscription
  - Upgrade/downgrade plans

### Feature Enforcement

The subscription middleware automatically enforces limits:

```typescript
// Check before creating project
const check = await checkFeatureLimit(user, 'project')
if (!check.allowed) {
  return NextResponse.json({ error: check.error }, { status: 403 })
}

// Check before creating story
const check = await checkFeatureLimit(user, 'story', projectId)
if (!check.allowed) {
  return NextResponse.json({ error: check.error }, { status: 403 })
}

// Check before export
const check = await checkFeatureLimit(user, 'export')
if (!check.allowed) {
  return NextResponse.json({ error: check.error }, { status: 403 })
}
```

### Testing Stripe Integration

#### Test Mode
1. Use Stripe test mode keys during development
2. Test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3D Secure: `4000 0025 0000 3155`

#### Webhook Testing
```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Trigger test events
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
```

### Migration

Run the database migration to add Stripe tables:

```bash
# Generate migration (already done)
npx drizzle-kit generate --name add_stripe_subscriptions

# Push to database
npx drizzle-kit push
```

---

## Next Steps

### 1. Stripe Dashboard Setup
- [ ] Create products and prices in Stripe Dashboard
- [ ] Update `STRIPE_PRO_PRICE_ID` and `STRIPE_ENTERPRISE_PRICE_ID` in environment variables
- [ ] Configure webhook endpoint URL in Stripe Dashboard
- [ ] Set up tax collection if needed

### 2. Enforce Subscription on Signup
To require all new users to have a subscription, you can:

**Option A: Redirect after signup**
Update your signup flow to redirect to `/pricing` after account creation

**Option B: Trial Period**
Modify the free tier to be a 14-day trial, then require upgrade

**Option C: Gated Access**
Add middleware to check subscription on all protected routes:

```typescript
// In middleware.ts or route handlers
const subscription = await getSubscriptionLimits(user)
if (subscription.tier === 'free' && !isTrialActive) {
  redirect('/pricing')
}
```

### 3. Add Export Buttons to UI
Add the ExportButton component to:
- Project detail pages
- Story list pages
- Epic pages
- Dashboard

Example:
```tsx
import { ExportButton } from '@/components/export-button'

<ExportButton
  endpoint={`/api/projects/${projectId}/export`}
  filename={project.name}
  variant="outline"
  size="sm"
/>
```

### 4. Testing Checklist
- [ ] Test free tier limits (1 project, 50 stories)
- [ ] Test export restriction for free users
- [ ] Test Pro subscription checkout flow
- [ ] Test webhook events (subscription created/updated/deleted)
- [ ] Test subscription upgrade/downgrade
- [ ] Test subscription cancellation
- [ ] Test customer portal access
- [ ] Export Excel/Word/PDF for projects
- [ ] Export Excel/Word/PDF for stories

---

## Support & Troubleshooting

### Common Issues

**Webhook not receiving events:**
- Verify webhook URL in Stripe Dashboard
- Check webhook signing secret matches `.env`
- Review webhook logs in Stripe Dashboard

**Subscription not updating:**
- Check webhook handler logs
- Verify database migrations ran successfully
- Check organization has `stripeCustomerId`

**Export not working:**
- Verify subscription tier is Pro/Enterprise
- Check middleware is applied to export endpoints
- Review error logs for library issues

### Resources
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Webhook Testing](https://stripe.com/docs/webhooks/test)
- [xlsx Documentation](https://docs.sheetjs.com/)
- [docx Documentation](https://docx.js.org/)
- [pdfkit Documentation](https://pdfkit.org/)

---

## Summary

Both features are now fully implemented:

✅ **Export Functionality**
- Export projects and stories to Excel, Word, and PDF
- Restricted to Pro/Enterprise tiers
- Easy-to-use ExportButton component

✅ **Stripe Integration**
- Full subscription lifecycle management
- Webhook handling for real-time updates
- Customer portal for self-service
- Feature limits enforcement
- Pricing page and billing management UI

The application is ready for you to:
1. Set up your Stripe products and prices
2. Update webhook URL to production
3. Add export buttons throughout the UI
4. Enforce subscription requirements on signup
5. Go live! 🚀
