/**
 * Component-Level Validation Tests for Pricing Components
 * 
 * Tests that PricingGrid component correctly displays
 * plan features, button text, and gated features for each tier.
 * 
 * Run: npm run test:plans
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PricingGrid, type Plan } from '@/components/pricing/PricingGrid'
import plansData from '@/config/plans.json'
import {
  simulateUpgrade,
  simulateDowngrade,
  getPlansForContext,
  expectFeatureVisible,
  type SubscriptionTier,
} from '@/test-utils/pricing'

// Convert plans.json structure to Plan[] format
function getPlansFromConfig(): Plan[] {
  return Object.values(plansData.tiers).map((tier: any) => ({
    id: tier.id,
    name: tier.name,
    label: tier.label,
    price: tier.price,
    priceAnnual: tier.priceAnnual,
    description: tier.description,
    minSeats: tier.minSeats,
    maxSeats: tier.maxSeats,
    features: tier.features || [],
    limitations: tier.limitations || [],
    popular: tier.popular || false,
    discount: tier.discount,
    discountNote: tier.discountNote,
  }))
}

// Expected button text per plan
const EXPECTED_BUTTON_TEXT: Record<string, string> = {
  starter: 'Continue with Starter Plan',
  core: 'Start Free Trial',
  pro: 'Start Free Trial',
  team: 'Start Free Trial',
  enterprise: 'Contact Sales →',
}

// Feature visibility matrix (planId -> feature keywords)
const FEATURE_VISIBILITY: Record<string, string[]> = {
  starter: [],
  core: ['template', 'custom document', 'advanced gherkin', 'split stories'],
  pro: ['smart context', '75%', 'semantic search', 'template'],
  team: ['smart context', 'deep reasoning', 'admin', 'dashboard', 'semantic search'],
  enterprise: ['smart context', 'deep reasoning', 'admin', 'compliance', 'audit', 'semantic search'],
}

describe('PricingGrid Component Validation', () => {
  const plans = getPlansFromConfig()
  const mockOnSelectPlan = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders all plans from config', () => {
    render(
      <PricingGrid
        plans={plans}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )

    // Check that all 5 plans are rendered (use getAllByText since names appear multiple times)
    expect(screen.getAllByText('Starter').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Core').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pro').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Team').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Enterprise').length).toBeGreaterThan(0)
  })

  test('renders plans in correct order', () => {
    const { container } = render(
      <PricingGrid
        plans={plans}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )

    // Get all plan cards by data-tier attribute
    const planCards = Array.from(container.querySelectorAll('[data-tier]'))
    const planIds = planCards.map((card: Element) => 
      card.getAttribute('data-tier')
    ).filter(Boolean) as string[]

    expect(planIds).toEqual(['starter', 'core', 'pro', 'team', 'enterprise'])
  })

  test('displays "Most Popular" badge only on Pro plan', () => {
    render(
      <PricingGrid
        plans={plans}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )

    const popularBadges = screen.queryAllByText(/most popular/i)
    expect(popularBadges.length).toBeGreaterThan(0)

    // Check that Pro card has the badge
    const proCard = document.querySelector('[data-tier="pro"]')
    expect(proCard).toBeInTheDocument()
    
    // Verify Pro has the badge
    const proHasBadge = proCard?.textContent?.includes('Most Popular') || false
    expect(proHasBadge).toBe(true)
    
    // Verify Starter doesn't have it
    const starterCard = document.querySelector('[data-tier="starter"]')
    const starterHasBadge = starterCard?.textContent?.includes('Most Popular') || false
    expect(starterHasBadge).toBe(false)
  })
})

describe('Plan Button Text Validation', () => {
  const plans = getPlansFromConfig()
  const mockOnSelectPlan = vi.fn()

  test.each([
    ['starter', 'Continue with Starter Plan'],
    ['core', 'Start Free Trial'],
    ['pro', 'Start Free Trial'],
    ['team', 'Start Free Trial'],
    ['enterprise', 'Contact Sales →'],
  ])('renders correct button text for %s plan', (planId, expectedText) => {
    const plan = plans.find((p) => p.id === planId)
    expect(plan).toBeDefined()

    render(
      <PricingGrid
        plans={[plan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )

    expect(screen.getByRole('button', { name: expectedText })).toBeInTheDocument()
  })
})

describe('Feature Visibility & Gating', () => {
  const plans = getPlansFromConfig()
  const mockOnSelectPlan = vi.fn()

  test('shows Smart Context only on Pro and above', () => {
    const proPlan = plans.find((p) => p.id === 'pro')
    const teamPlan = plans.find((p) => p.id === 'team')
    const corePlan = plans.find((p) => p.id === 'core')

    // Pro should have Smart Context
    const { container: proContainer } = render(
      <PricingGrid
        plans={[proPlan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )
    expect(proContainer.textContent?.toLowerCase()).toContain('smart context')

    // Team should have Smart Context
    const { container: teamContainer } = render(
      <PricingGrid
        plans={[teamPlan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )
    expect(teamContainer.textContent?.toLowerCase()).toContain('smart context')

    // Core should NOT have Smart Context
    const { container: coreContainer } = render(
      <PricingGrid
        plans={[corePlan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )
    expect(coreContainer.textContent?.toLowerCase()).not.toContain('smart context')
  })

  test('shows Deep Reasoning only on Team and above', () => {
    const teamPlan = plans.find((p) => p.id === 'team')
    const enterprisePlan = plans.find((p) => p.id === 'enterprise')
    const proPlan = plans.find((p) => p.id === 'pro')

    // Team should have Deep Reasoning
    const { container: teamContainer } = render(
      <PricingGrid
        plans={[teamPlan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )
    expect(teamContainer.textContent?.toLowerCase()).toContain('deep reasoning')

    // Enterprise should have Deep Reasoning
    const { container: enterpriseContainer } = render(
      <PricingGrid
        plans={[enterprisePlan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )
    expect(enterpriseContainer.textContent?.toLowerCase()).toContain('deep reasoning')

    // Pro should NOT have Deep Reasoning
    const { container: proContainer } = render(
      <PricingGrid
        plans={[proPlan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )
    expect(proContainer.textContent?.toLowerCase()).not.toContain('deep reasoning')
  })

  test('shows Custom Templates on Core and above', () => {
    const corePlan = plans.find((p) => p.id === 'core')
    const proPlan = plans.find((p) => p.id === 'pro')
    const starterPlan = plans.find((p) => p.id === 'starter')

    // Core should have Custom Templates
    const { container: coreContainer } = render(
      <PricingGrid
        plans={[corePlan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )
    expect(coreContainer.textContent?.toLowerCase()).toMatch(/custom.*template|template.*custom/)

    // Pro should have Custom Templates
    const { container: proContainer } = render(
      <PricingGrid
        plans={[proPlan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )
    expect(proContainer.textContent?.toLowerCase()).toMatch(/custom.*template|template.*custom/)

    // Starter should NOT have Custom Templates
    const { container: starterContainer } = render(
      <PricingGrid
        plans={[starterPlan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )
    expect(starterContainer.textContent?.toLowerCase()).not.toMatch(/custom.*template|template.*custom/)
  })

  test('shows Admin Dashboard only on Team and above', () => {
    const teamPlan = plans.find((p) => p.id === 'team')
    const enterprisePlan = plans.find((p) => p.id === 'enterprise')
    const proPlan = plans.find((p) => p.id === 'pro')

    // Team should have Admin Dashboard
    const { container: teamContainer } = render(
      <PricingGrid
        plans={[teamPlan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )
    expect(teamContainer.textContent?.toLowerCase()).toMatch(/admin.*dashboard|dashboard.*admin/)

    // Enterprise should have Admin Dashboard (via "Everything in Team")
    const { container: enterpriseContainer } = render(
      <PricingGrid
        plans={[enterprisePlan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )
    expect(enterpriseContainer.textContent?.toLowerCase()).toMatch(/admin.*dashboard|dashboard.*admin|everything in team/)

    // Pro should NOT have Admin Dashboard
    const { container: proContainer } = render(
      <PricingGrid
        plans={[proPlan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )
    expect(proContainer.textContent?.toLowerCase()).not.toMatch(/admin.*dashboard|dashboard.*admin/)
  })

  test('shows Compliance options only on Enterprise', () => {
    const enterprisePlan = plans.find((p) => p.id === 'enterprise')
    const teamPlan = plans.find((p) => p.id === 'team')

    // Enterprise should have Compliance (check for explicit compliance feature)
    const { container: enterpriseContainer } = render(
      <PricingGrid
        plans={[enterprisePlan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )
    // Check for explicit compliance mention (not just in "compliance stories")
    const enterpriseText = enterpriseContainer.textContent?.toLowerCase() || ''
    expect(enterpriseText).toMatch(/compliance.*audit|audit.*compliance|compliance.*logging/)

    // Team should NOT have explicit Compliance options (may mention it in context)
    const { container: teamContainer } = render(
      <PricingGrid
        plans={[teamPlan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )
    const teamText = teamContainer.textContent?.toLowerCase() || ''
    // Team mentions compliance in context but not as a feature
    expect(teamText).not.toMatch(/compliance.*audit|audit.*compliance|compliance.*logging/)
  })
})

describe('Price Display Validation', () => {
  const plans = getPlansFromConfig()
  const mockOnSelectPlan = vi.fn()

  test('displays Free for Starter plan', () => {
    const starterPlan = plans.find((p) => p.id === 'starter')
    const { container } = render(
      <PricingGrid
        plans={[starterPlan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )
    // Check that "Free" appears in the price display area
    const priceElement = container.querySelector('[data-tier="starter"]')
    expect(priceElement?.textContent).toContain('Free')
  })

  test('displays correct price for Core plan', () => {
    const corePlan = plans.find((p) => p.id === 'core')
    render(
      <PricingGrid
        plans={[corePlan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )
    expect(screen.getByText(/£10\.99/)).toBeInTheDocument()
  })

  test('displays Custom for Enterprise plan', () => {
    const enterprisePlan = plans.find((p) => p.id === 'enterprise')
    render(
      <PricingGrid
        plans={[enterprisePlan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )
    expect(screen.getByText('Custom')).toBeInTheDocument()
  })
})

describe('Plan Upgrade Behaviour', () => {
  const plans = getPlansFromConfig()
  const mockOnSelectPlan = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('calls onSelectPlan handler when plan button clicked', async () => {
    const user = userEvent.setup()
    const proPlan = plans.find((p) => p.id === 'pro')

    render(
      <PricingGrid
        plans={[proPlan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )

    const button = screen.getByRole('button', { name: /start free trial/i })
    await user.click(button)

    expect(mockOnSelectPlan).toHaveBeenCalledWith('pro')
  })

  test('disables button when loading', () => {
    const proPlan = plans.find((p) => p.id === 'pro')

    render(
      <PricingGrid
        plans={[proPlan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
        loading="pro"
      />
    )

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  test('simulates upgrade from Core to Pro', () => {
    const result = simulateUpgrade('core', 'pro')

    expect(result.upgradeAllowed).toBe(true)
    expect(result.currentTier).toBe('core')
    expect(result.targetTier).toBe('pro')
    expect(result.buttonText).toBe('Start Free Trial')
    expect(result.featuresUnlocked.length).toBeGreaterThan(0)
    expect(result.featuresUnlocked.some((f) => f.includes('smart context'))).toBe(true)
  })

  test('simulates upgrade from Starter to Team', () => {
    const result = simulateUpgrade('starter', 'team')

    expect(result.upgradeAllowed).toBe(true)
    expect(result.featuresUnlocked.some((f) => f.includes('deep reasoning'))).toBe(true)
    expect(result.featuresUnlocked.some((f) => f.includes('admin'))).toBe(true)
  })

  test('prevents invalid upgrade (Pro to Core)', () => {
    const result = simulateUpgrade('pro', 'core')

    expect(result.upgradeAllowed).toBe(false)
  })

  test('simulates downgrade from Team to Core', () => {
    const result = simulateDowngrade('team', 'core')

    expect(result.upgradeAllowed).toBe(true) // Downgrade is allowed
    expect(result.featuresLocked.length).toBeGreaterThan(0)
    expect(result.featuresLocked.some((f) => f.includes('deep reasoning'))).toBe(true)
    expect(result.featuresLocked.some((f) => f.includes('admin'))).toBe(true)
  })

  test('simulates downgrade from Enterprise to Pro', () => {
    const result = simulateDowngrade('enterprise', 'pro')

    expect(result.upgradeAllowed).toBe(true)
    expect(result.featuresLocked.some((f) => f.includes('compliance'))).toBe(true)
  })
})

describe('Plan Description Validation', () => {
  const plans = getPlansFromConfig()
  const mockOnSelectPlan = vi.fn()

  test.each([
    ['starter', 'For individuals exploring SynqForge'],
    ['core', 'For freelancers and solo business analysts'],
    ['pro', 'For small delivery teams'],
    ['team', 'For larger Agile teams'],
    ['enterprise', 'For scaled organisations and secure deployments'],
  ])('displays correct description for %s plan', (planId, expectedDescription) => {
    const plan = plans.find((p) => p.id === planId)
    render(
      <PricingGrid
        plans={[plan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={mockOnSelectPlan}
      />
    )
    expect(screen.getByText(expectedDescription)).toBeInTheDocument()
  })
})

describe('Plan Upgrade/Downgrade Simulation', () => {
  test('simulateUpgrade correctly identifies feature unlocks', () => {
    const result = simulateUpgrade('core', 'pro')

    expect(result.upgradeAllowed).toBe(true)
    expect(result.featuresUnlocked.length).toBeGreaterThan(0)
    expect(result.featuresUnlocked.some((f) => f.includes('smart context'))).toBe(true)
    expect(result.featuresUnlocked.some((f) => f.includes('semantic'))).toBe(true)
  })

  test('simulateDowngrade correctly identifies feature losses', () => {
    const result = simulateDowngrade('team', 'core')

    expect(result.upgradeAllowed).toBe(true) // Downgrade is allowed
    expect(result.featuresLocked.length).toBeGreaterThan(0)
    expect(result.featuresLocked.some((f) => f.includes('deep reasoning'))).toBe(true)
    expect(result.featuresLocked.some((f) => f.includes('admin'))).toBe(true)
  })

  test('getPlansForContext returns all plans', () => {
    const plans = getPlansForContext()
    
    expect(plans.length).toBe(5)
    expect(plans.find((p) => p.id === 'core')).toBeDefined()
    expect(plans.find((p) => p.id === 'pro')).toBeDefined()
  })

  test('expectFeatureVisible helper works correctly', () => {
    const plans = getPlansFromConfig()
    const proPlan = plans.find((p) => p.id === 'pro')
    const { container } = render(
      <PricingGrid
        plans={[proPlan!]}
        billingInterval="monthly"
        currency="gbp"
        onSelectPlan={vi.fn()}
      />
    )
    
    // Pro should have Smart Context
    expectFeatureVisible(container, 'smart context', true)
    
    // Pro should NOT have Deep Reasoning
    expectFeatureVisible(container, 'deep reasoning', false)
  })
})

