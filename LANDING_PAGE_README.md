# Landing Page Update — October 2025

## Overview

The SynqForge landing page has been refactored to focus on clarity, conversions, and accurate feature representation. The page now emphasizes the core value proposition: **AI-generated sprint-ready user stories** with **Word, Excel, and PDF exports**.

## Structure

The landing page is composed of the following sections:

1. **Hero** — Main headline, subheadline, CTAs, and mini metrics
2. **How It Works** — 3-step process explaining the workflow
3. **Why SynqForge** — 4 key benefits in a grid
4. **Who It's For** — 4 target audience cards
5. **Example Output** — Sample story preview with download button
6. **CTA Footer** — Final conversion section

## Editing Copy

### Component Locations

All landing page components are in `/components/landing/`:
- `Hero.tsx` — Hero section with headline and CTAs
- `HowItWorks.tsx` — 3-step process cards
- `WhySynqForge.tsx` — Benefits grid
- `WhoFor.tsx` — Target audience cards
- `ExampleOutput.tsx` — Sample story and download
- `CtaFooter.tsx` — Final CTA section

### Main Page

The main landing page is at `/app/page.tsx` and imports all sections.

### Metadata (SEO)

Update title and description in `/app/layout.tsx`:
```typescript
export const metadata: Metadata = {
  title: 'SynqForge — Turn Ideas into Sprint-Ready User Stories',
  description: 'AI that turns requirements into sprint-ready user stories...',
}
```

## Sample Export File

The "Download Sample Export (Word)" button points to:
```
/samples/synqforge-sample.docx
```

**To add the sample file:**

1. Generate a sample story using SynqForge's export feature, or
2. Create a Word document manually with a sample user story (title, description, acceptance criteria, story points)
3. Save it as `synqforge-sample.docx` in `/public/samples/`

The placeholder instructions are in `/public/samples/README.txt`.

## Analytics

All primary CTAs have `data-cta` attributes for tracking:
- `data-cta="try-generation"` — Main CTA buttons
- `data-cta="see-example"` — Secondary CTA (See Example Output)
- `data-cta="download-sample-word"` — Sample download button

## Accessibility

All components follow WCAG AA guidelines:
- Semantic HTML (header, section, nav)
- Keyboard-navigable with visible focus states
- `aria-label` attributes on interactive elements
- Sufficient color contrast (≥4.5:1 for body, ≥3:1 for headings)
- Meaningful alt text for icons (marked as `aria-hidden="true"` when decorative)

## Design

The page maintains the existing dark gradient aesthetic with brand colors:
- Purple (`brand-purple-400/500`) for primary accents
- Emerald (`brand-emerald-400/500`) for secondary accents
- Dark background with gradient overlays
- Glass morphism effects on select elements

## Mobile Responsiveness

All sections are mobile-first and tested at:
- 320-390px (mobile)
- 768px (tablet)
- 1024px (desktop)
- 1440px+ (large desktop)

CTAs have large hit targets and stack vertically on mobile.

## What Was Changed

### Removed
- "110x Faster" claims (unsubstantiated)
- References to features not yet built (Jira sync, ClickUp integration)
- Generic "Everything You Need" feature grid

### Added
- Clear value proposition in hero
- 3-step "How It Works" process
- "Why Teams Use SynqForge" benefits
- "Who It's For" target audience section
- Example output with sample story preview
- Accurate export format mentions (Word, Excel, PDF)
- Analytics data attributes
- Improved accessibility and semantic HTML

## Next Steps

1. Add the sample Word export file to `/public/samples/synqforge-sample.docx`
2. Test the page at different viewport sizes
3. Verify all CTAs link to correct destinations
4. Run Lighthouse audit (target: Performance ≥85, Accessibility ≥95, SEO ≥90)
5. Set up analytics to track `data-cta` attributes

