# Pricing V3.0 QA Checklist

**Version:** 3.0.0  
**Date:** January 24, 2025  
**Environment:** Staging / Production  
**Tester:** ___________________  

---

## 🎯 Pre-Deployment Checklist

### Code Quality
- [ ] All unit tests passing (`npm run test:unit`)
- [ ] Pricing validation tests passing
- [ ] No ESLint errors or warnings
- [ ] TypeScript compiles without errors
- [ ] Build completes successfully (`npm run build`)

### Data Validation
- [ ] `config/plans.json` validates against schema
- [ ] All prices in GBP (£)
- [ ] Prices match between plans.json and constants.ts
- [ ] Add-on eligibility rules correct
- [ ] FAQ content reviewed and approved

### Environment Variables
- [ ] Stripe price IDs configured in Vercel
- [ ] All 9 price IDs present (4 tiers × monthly/annual + 3 add-ons)
- [ ] Webhook secret configured
- [ ] Environment variables loaded correctly

---

## 💻 Desktop Testing (1920×1080)

### Pricing Page (`/pricing`)

#### Layout & Design
- [ ] Page loads without errors
- [ ] 5-column grid displays correctly
- [ ] Pro (Collaborative) card has "Most Popular" badge
- [ ] Pro (Collaborative) card has scale/shadow effect
- [ ] Card icons render correctly (Sparkles, Zap, Users, Building)
- [ ] Pricing colors match design (green, blue, purple, orange, pink)
- [ ] All cards have equal height
- [ ] Typography is legible and hierarchy clear

#### Pricing Display
- [ ] Starter shows "£0" and "Free"
- [ ] Pro (Solo) shows "£10.99/user/mo"
- [ ] Pro (Collaborative) shows "£19.99/user/mo"
- [ ] Team shows "£16.99/user/mo"
- [ ] Enterprise shows "Starts £25" or "Custom"
- [ ] Annual toggle works correctly
- [ ] Annual prices update when toggled
- [ ] "Save 17%" badge appears in annual mode

#### Features & Content
- [ ] All feature lists display correctly
- [ ] Checkmarks (✓) render in green
- [ ] Cross marks (×) render for limitations
- [ ] Seat ranges display correctly (1, 1-2, 3-4, 5+, 10+)
- [ ] Team discount badge shows "15% off • vs 5× Pro"
- [ ] "Add-ons available" badge shows for eligible tiers

#### Interactions
- [ ] Hover effects work on cards
- [ ] CTA buttons respond to hover
- [ ] Clicking "Get Started" (Starter) shows appropriate action
- [ ] Clicking "Start Free Trial" (Pro/Team) initiates checkout
- [ ] Clicking "Contact Sales" (Enterprise) redirects to /contact
- [ ] Loading states show spinner during checkout
- [ ] Error handling works if checkout fails

### AI Actions Section
- [ ] Section displays all 6 example actions
- [ ] Action costs show correctly (1×, 2×)
- [ ] Cards have hover effect
- [ ] "Pro tip" callout is visible and styled
- [ ] Content is readable and clear

### Add-Ons Section
- [ ] 3 add-on cards display in grid
- [ ] Icons render correctly (Package, Zap, Headphones)
- [ ] Prices show correctly (£20, £5, £15)
- [ ] "One-time" and "Monthly" badges display
- [ ] Eligibility text is correct
- [ ] "90-day expiry" badge shows on AI Actions Pack
- [ ] "Add to Account" buttons work
- [ ] Link to `/app/billing/add-ons` is correct

### FAQ Section
- [ ] Accordion displays all 5 questions
- [ ] Questions expand/collapse correctly
- [ ] Only one question open at a time
- [ ] Answer text is readable
- [ ] Questions cover key topics (pooling, buying more, limits, discount)
- [ ] "Contact sales team" link works

### Competitive Benchmark
- [ ] Section displays with gradient background
- [ ] 4 comparison cards show (Jira, Linear, ClickUp, Shortcut)
- [ ] Pricing comparisons are accurate
- [ ] Callout message is clear and compelling

### Footer CTA
- [ ] "Questions about pricing?" heading displays
- [ ] Both CTA buttons present
- [ ] "Contact Sales" button redirects correctly
- [ ] "Start Free Trial" button redirects correctly
- [ ] Disclaimer text displays (VAT, annual billing, trial)

---

## 📱 Mobile Testing (375×667 - iPhone SE)

### Pricing Page Layout
- [ ] Single column layout
- [ ] Cards stack vertically
- [ ] All content readable without horizontal scroll
- [ ] Touch targets are 44×44px minimum
- [ ] Pro (Collaborative) "Most Popular" badge visible

### Interactive Elements
- [ ] Annual/monthly toggle works on mobile
- [ ] All CTA buttons tappable
- [ ] Accordion expands/collapses smoothly
- [ ] No layout shift when toggling sections
- [ ] Scroll performance is smooth

### Navigation
- [ ] Back button works (if present)
- [ ] Footer links are tappable
- [ ] External links open correctly

---

## 💳 Tablet Testing (768×1024 - iPad)

### Layout
- [ ] 2-column grid for pricing cards
- [ ] Proper spacing between elements
- [ ] Touch-friendly sizing
- [ ] No awkward breakpoint issues

---

## 🛒 Checkout Flow Testing

### Pro (Solo) Checkout
- [ ] Click "Start Free Trial" on Pro (Solo) card
- [ ] Redirects to Stripe Checkout (or sign-in if not logged in)
- [ ] Correct plan name shows in Stripe
- [ ] Price displays as £10.99/month (or £109.90/year if annual)
- [ ] Seat quantity defaults to 1
- [ ] Can increase seats to 2 maximum
- [ ] Payment methods accepted (card, Apple Pay, Google Pay)
- [ ] Successful purchase redirects to success page
- [ ] Subscription shows in user account

### Pro (Collaborative) Checkout
- [ ] Click "Start Free Trial" on Pro (Collaborative) card
- [ ] Correct plan name and price (£19.99/month or £199.90/year)
- [ ] Seat quantity defaults to 3
- [ ] Can increase seats up to 4
- [ ] Cannot reduce below 3 seats
- [ ] Successful purchase activates Pro (Collaborative) tier

### Team Checkout
- [ ] Click "Start Free Trial" on Team card
- [ ] Correct plan name and price (£16.99/month or £169.90/year)
- [ ] Seat quantity defaults to 5
- [ ] Can increase seats without limit
- [ ] Cannot reduce below 5 seats
- [ ] "15% discount vs Pro" messaging shows (if applicable)
- [ ] Successful purchase activates Team tier

### Enterprise Flow
- [ ] Click "Contact Sales" on Enterprise card
- [ ] Redirects to /contact page
- [ ] Contact form loads correctly
- [ ] "Enterprise inquiry" pre-selected (if applicable)

---

## 🔌 Add-Ons Testing (`/addons` page)

### Page Layout
- [ ] Page loads without errors
- [ ] "Back to Pricing" button works
- [ ] 3 add-on cards display in grid
- [ ] Mobile: Cards stack vertically
- [ ] Desktop: 3-column grid

### Add-On Cards
- [ ] All prices correct (£20, £5, £15)
- [ ] Icons display correctly
- [ ] Feature lists are complete
- [ ] Eligibility information accurate
- [ ] Badges show for type, expiry, stackable

### "How It Works" Section
- [ ] 4 info blocks display in 2×2 grid
- [ ] Icons render correctly
- [ ] Content is clear and helpful
- [ ] Mobile: Stacks to single column

### Purchase Flow

#### AI Actions Pack (£20 one-time)
- [ ] Click "Add to Account"
- [ ] Redirects to Stripe Checkout (payment mode)
- [ ] Shows as one-time payment
- [ ] Price is £20
- [ ] Cannot select quantity (fixed at 1 pack)
- [ ] Purchase success adds 1,000 actions
- [ ] Expiry date set to +90 days
- [ ] Can purchase multiple times (up to 5 active)

#### AI Booster (£5/month)
- [ ] Only available if on Starter plan
- [ ] Click "Add to Account"
- [ ] Redirects to Stripe Checkout (subscription mode)
- [ ] Shows as monthly subscription
- [ ] Price is £5/month
- [ ] Purchase success adds 200 actions/month
- [ ] Can be cancelled anytime

#### Priority Support (£15/month)
- [ ] Only available if on Pro (Solo) or Pro (Collaborative)
- [ ] Click "Add to Account"
- [ ] Shows as monthly subscription
- [ ] Price is £15/month
- [ ] Purchase success upgrades support level
- [ ] Support queue reflects priority status

---

## 🧪 Functional Testing

### Plan Eligibility
- [ ] Starter users cannot buy Priority Support
- [ ] Pro users cannot buy AI Booster
- [ ] Team users can buy AI Actions Pack
- [ ] Enterprise users can buy AI Actions Pack
- [ ] Error messages for ineligible add-ons

### AI Action Limits
- [ ] Starter users limited to 25 actions
- [ ] Pro (Solo) users get 400 actions
- [ ] Pro (Collaborative) users get 800 actions
- [ ] Team users get 10k + 1k per seat
- [ ] Actions decrement correctly on usage
- [ ] Rollover applies for Pro tiers (20%)
- [ ] Pooling works for Team tier

### Authentication Flow
- [ ] Unauthenticated users see pricing page
- [ ] Clicking CTA redirects to sign-in
- [ ] After sign-in, returns to pricing with selection
- [ ] Authenticated users go directly to checkout
- [ ] Session persists through checkout

---

## 🎨 Visual Regression Testing

### Light Theme
- [ ] All colors render correctly
- [ ] Contrast ratios meet WCAG AA
- [ ] Text is readable on all backgrounds
- [ ] Badges have correct colors
- [ ] Card shadows are subtle but visible

### Dark Theme
- [ ] Page switches to dark mode correctly
- [ ] All colors adapt properly
- [ ] Contrast remains acceptable
- [ ] Gradient effects still visible
- [ ] Text remains readable

---

## 🌐 Cross-Browser Testing

### Chrome (Latest)
- [ ] Layout correct
- [ ] Interactions work
- [ ] Checkout flow works
- [ ] Performance acceptable

### Firefox (Latest)
- [ ] Layout correct
- [ ] Interactions work
- [ ] Checkout flow works
- [ ] Performance acceptable

### Safari (Latest)
- [ ] Layout correct
- [ ] Interactions work
- [ ] Checkout flow works
- [ ] Performance acceptable
- [ ] iOS Safari tested

### Edge (Latest)
- [ ] Layout correct
- [ ] Interactions work
- [ ] Checkout flow works

---

## 🔍 SEO & Metadata

### Meta Tags
- [ ] Page title: "Pricing - SynqForge"
- [ ] Meta description present and compelling
- [ ] OG tags set correctly
- [ ] Twitter card tags present
- [ ] Canonical URL correct

### Structured Data
- [ ] Schema.org markup for pricing
- [ ] Product schema for each tier
- [ ] Offer schema with prices
- [ ] Valid JSON-LD (test with Google's tool)

### Performance
- [ ] Lighthouse score > 90 (Performance)
- [ ] Lighthouse score > 90 (Accessibility)
- [ ] Lighthouse score > 90 (Best Practices)
- [ ] Lighthouse score > 90 (SEO)
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3.5s

---

## 🔐 Security Testing

### Input Validation
- [ ] Checkout forms validate inputs
- [ ] Cannot inject XSS in any field
- [ ] SQL injection not possible (using ORM)
- [ ] CSRF tokens present on forms

### Payment Security
- [ ] Stripe hosted checkout used (PCI compliant)
- [ ] No card data touches our servers
- [ ] Webhook signatures verified
- [ ] SSL certificate valid

### Authorization
- [ ] Users can only manage their own subscriptions
- [ ] Admin routes are protected
- [ ] API endpoints require authentication
- [ ] Rate limiting in place

---

## 📊 Analytics Testing

### Event Tracking
- [ ] `pricing_page_view` fires on load
- [ ] `plan_card_click` fires with tier name
- [ ] `billing_interval_toggle` fires on switch
- [ ] `cta_click` fires with plan and intent
- [ ] `checkout_started` fires with plan details
- [ ] `checkout_completed` fires on success
- [ ] `addon_click` fires with addon ID

### Data Validation
- [ ] All events have required properties
- [ ] User ID attached when logged in
- [ ] Timestamps are accurate
- [ ] No duplicate events
- [ ] Events appear in analytics dashboard

---

## ♿ Accessibility Testing

### Keyboard Navigation
- [ ] Can tab through all interactive elements
- [ ] Focus indicators visible
- [ ] Accordion keyboard accessible
- [ ] Modal dialogs trap focus
- [ ] Skip links present

### Screen Reader
- [ ] Page structure announced correctly
- [ ] Headings in logical order (h1 → h2 → h3)
- [ ] Images have alt text
- [ ] Links have descriptive text
- [ ] Form labels associated correctly
- [ ] ARIA labels where needed

### Color Contrast
- [ ] Text meets WCAG AA (4.5:1)
- [ ] Large text meets WCAG AA (3:1)
- [ ] Interactive elements distinguishable
- [ ] Not relying on color alone

---

## 🌍 Internationalization (Future)

### Currency Display
- [ ] GBP symbol (£) displays correctly
- [ ] Decimal places consistent (2 digits)
- [ ] No USD symbols remaining
- [ ] Numbers formatted correctly (10.99, not 10,99)

### Text Content
- [ ] All copy in British English
- [ ] No hardcoded strings (using i18n keys)
- [ ] Date formats: DD/MM/YYYY
- [ ] Prepared for multi-language support

---

## 📧 Email Testing

### Transactional Emails
- [ ] Subscription confirmation email sent
- [ ] Contains correct plan name and price
- [ ] Invoice attached (or link to invoice)
- [ ] CTA to manage subscription works
- [ ] Unsubscribe link present

### Welcome Email
- [ ] Sent after signup
- [ ] Personalised with user name
- [ ] Contains getting started guide
- [ ] Links to docs and support

### Upgrade/Downgrade Emails
- [ ] Sent when plan changes
- [ ] Explains prorated charges
- [ ] New plan details correct
- [ ] Next billing date shown

---

## 🐛 Error Handling

### Error Scenarios
- [ ] Invalid price ID: Shows error message
- [ ] Stripe API down: Shows friendly error
- [ ] Network timeout: Retries then fails gracefully
- [ ] Cancelled checkout: Returns to pricing page
- [ ] Payment declined: Shows specific error
- [ ] Session expired: Prompts re-login

### User Experience
- [ ] Error messages are clear and actionable
- [ ] No technical jargon
- [ ] Offers next steps
- [ ] Support contact info provided

---

## 📋 Content Testing

### Copy Accuracy
- [ ] All prices match approved pricing grid
- [ ] Feature lists accurate for each tier
- [ ] No typos or grammatical errors
- [ ] Links work and go to correct pages
- [ ] Disclaimers are legally accurate

### Marketing Claims
- [ ] "15% discount" math is correct (Team vs 5× Pro)
- [ ] "17% off annual" math is correct
- [ ] Competitive comparisons are accurate
- [ ] All claims can be substantiated
- [ ] No misleading statements

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All QA checks passed
- [ ] Stakeholder approval received
- [ ] Marketing team notified
- [ ] Support team trained
- [ ] Changelog finalized

### Deployment
- [ ] Code merged to main
- [ ] Vercel build successful
- [ ] Environment variables set
- [ ] Database migrations run (if any)
- [ ] Stripe products created
- [ ] CDN cache cleared

### Post-Deployment
- [ ] Smoke test in production
- [ ] Pricing page loads
- [ ] Checkout flow works
- [ ] Monitoring dashboard checked
- [ ] No errors in logs (first 30 mins)

### Rollout Plan
- [ ] Soft launch to 10% of users (if applicable)
- [ ] Monitor conversion rates
- [ ] Gradual rollout to 50%, then 100%
- [ ] Announcement email scheduled
- [ ] Social media posts scheduled

---

## 📞 Communication Plan

### Internal
- [ ] Engineering team notified
- [ ] Support team has new pricing guide
- [ ] Sales team has updated pitch deck
- [ ] Finance team updated revenue model
- [ ] All hands announcement scheduled

### External
- [ ] Existing customers notified (7 days notice)
- [ ] Blog post published
- [ ] Social media announcements
- [ ] Email to mailing list
- [ ] Update public roadmap

---

## 🔄 Monitoring & Rollback

### Metrics to Monitor (First 7 Days)
- [ ] Pricing page views
- [ ] Conversion rate (pricing → checkout)
- [ ] Checkout completion rate
- [ ] Average order value
- [ ] Add-on attach rate
- [ ] Bounce rate on pricing page
- [ ] Time on page
- [ ] Error rate

### Rollback Criteria
- [ ] Conversion rate drops > 20%
- [ ] Critical errors affecting > 5% of users
- [ ] Payment processing failure rate > 1%
- [ ] Customer complaints spike

### Rollback Plan
- [ ] Revert to previous version in Git
- [ ] Restore old pricing page
- [ ] Notify Stripe to revert products
- [ ] Communicate to affected users
- [ ] Post-mortem within 48 hours

---

## ✅ Sign-Off

| Role | Name | Status | Date | Signature |
|------|------|--------|------|-----------|
| **QA Lead** | ________________ | ☐ Pass ☐ Fail | __________ | _____________ |
| **Product Manager** | ________________ | ☐ Approved | __________ | _____________ |
| **Engineering Lead** | ________________ | ☐ Approved | __________ | _____________ |
| **Marketing Lead** | ________________ | ☐ Approved | __________ | _____________ |
| **CTO/VP Eng** | ________________ | ☐ Approved | __________ | _____________ |

---

## 📝 Notes & Issues Found

| Issue # | Description | Severity | Status | Assigned To | Date |
|---------|-------------|----------|--------|-------------|------|
| | | | | | |
| | | | | | |
| | | | | | |

**Severity Levels:**
- 🔴 Critical: Blocks release
- 🟠 High: Should fix before release
- 🟡 Medium: Fix in next patch
- 🟢 Low: Nice to have

---

**Last Updated:** January 24, 2025  
**Document Version:** 1.0  
**QA Environment:** Staging / Production  
**Next Review:** 7 days post-launch

