#!/usr/bin/env tsx
/**
 * Automated Plan Validation Script (Production QA)
 * 
 * Validates that all plan definitions and entitlements are correctly implemented
 * in production for SynqForge.
 * 
 * Usage: npx tsx scripts/validate-plans-production.ts
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get directory path (works with tsx)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Expected plan definitions
interface ExpectedPlan {
  id: string
  name: string
  description: string
  aiActions: number | { base: number; perSeat: number } | 'custom'
  rollover: number | 'policy' | 0
  features: {
    rollover: boolean
    smartContext: boolean
    deepReasoning: boolean
    customTemplates: boolean
    adminDashboard: boolean
    compliance: boolean
    semanticSearch: boolean
    pooling: boolean
  }
  ui: {
    buttonText: string
    description: string
  }
}

const EXPECTED_PLANS: Record<string, ExpectedPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'For individuals exploring SynqForge',
    aiActions: 25,
    rollover: 0,
    features: {
      rollover: false,
      smartContext: false,
      deepReasoning: false,
      customTemplates: false,
      adminDashboard: false,
      compliance: false,
      semanticSearch: false,
      pooling: false,
    },
    ui: {
      buttonText: 'Continue with Starter Plan',
      description: 'For individuals exploring SynqForge',
    },
  },
  core: {
    id: 'core',
    name: 'Core',
    description: 'For freelancers and solo business analysts',
    aiActions: 400,
    rollover: 20,
    features: {
      rollover: true,
      smartContext: false,
      deepReasoning: false,
      customTemplates: true,
      adminDashboard: false,
      compliance: false,
      semanticSearch: false,
      pooling: false,
    },
    ui: {
      buttonText: 'Start Free Trial',
      description: 'For freelancers and solo business analysts',
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For small delivery teams',
    aiActions: 800,
    rollover: 20,
    features: {
      rollover: true,
      smartContext: true,
      deepReasoning: false,
      customTemplates: true,
      adminDashboard: false,
      compliance: false,
      semanticSearch: true,
      pooling: false,
    },
    ui: {
      buttonText: 'Start Free Trial',
      description: 'For small delivery teams',
    },
  },
  team: {
    id: 'team',
    name: 'Team',
    description: 'For larger Agile teams',
    aiActions: { base: 10000, perSeat: 1000 },
    rollover: 20,
    features: {
      rollover: true,
      smartContext: true,
      deepReasoning: true,
      customTemplates: true,
      adminDashboard: true,
      compliance: false,
      semanticSearch: true,
      pooling: true,
    },
    ui: {
      buttonText: 'Start Free Trial',
      description: 'For larger Agile teams',
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For scaled organisations and secure deployments',
    aiActions: 'custom',
    rollover: 'policy',
    features: {
      rollover: true,
      smartContext: true,
      deepReasoning: true,
      customTemplates: true,
      adminDashboard: true,
      compliance: true,
      semanticSearch: true,
      pooling: true,
    },
    ui: {
      buttonText: 'Contact Sales →',
      description: 'For scaled organisations and secure deployments',
    },
  },
}

interface ValidationResult {
  plan: string
  config: 'PASS' | 'WARN' | 'FAIL'
  ui: 'PASS' | 'WARN' | 'FAIL'
  featureEnforcement: 'PASS' | 'WARN' | 'FAIL'
  notes: string[]
}

function validatePlan(planId: string, planData: any, expected: ExpectedPlan, allPlans: any): ValidationResult {
  const notes: string[] = []
  let configStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS'
  let uiStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS'
  let featureStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS'

  // 1. Config validation
  if (planData.id !== expected.id) {
    notes.push(`ID mismatch: expected "${expected.id}", got "${planData.id}"`)
    configStatus = 'FAIL'
  }

  if (planData.name !== expected.name) {
    notes.push(`Name mismatch: expected "${expected.name}", got "${planData.name}"`)
    configStatus = 'FAIL'
  }

  if (planData.description !== expected.description) {
    notes.push(`Description mismatch: expected "${expected.description}", got "${planData.description}"`)
    configStatus = 'WARN'
  }

  // Validate AI actions
  if (expected.aiActions === 'custom') {
    if (planData.actionsBase !== 'custom' && planData.actions !== 'custom') {
      notes.push(`Expected custom AI actions, but got numeric value`)
      configStatus = 'FAIL'
    }
  } else if (typeof expected.aiActions === 'number') {
    if (planData.actions !== expected.aiActions) {
      notes.push(`AI actions mismatch: expected ${expected.aiActions}, got ${planData.actions}`)
      configStatus = 'FAIL'
    }
  } else {
    // Pooled actions
    if (planData.actionsBase !== expected.aiActions.base || planData.actionsPerSeat !== expected.aiActions.perSeat) {
      notes.push(
        `AI actions mismatch: expected base ${expected.aiActions.base} + ${expected.aiActions.perSeat}/seat, got base ${planData.actionsBase} + ${planData.actionsPerSeat}/seat`
      )
      configStatus = 'FAIL'
    }
  }

  // Validate rollover
  if (expected.rollover === 'policy') {
    if (planData.rollover !== 'policy') {
      notes.push(`Expected policy-based rollover, got ${planData.rollover}`)
      configStatus = 'FAIL'
    }
  } else if (planData.rollover !== expected.rollover) {
    notes.push(`Rollover mismatch: expected ${expected.rollover}%, got ${planData.rollover}%`)
    configStatus = 'FAIL'
  }

  // Validate pooling
  if (expected.features.pooling !== planData.pooling) {
    notes.push(`Pooling mismatch: expected ${expected.features.pooling}, got ${planData.pooling}`)
    configStatus = 'FAIL'
  }

  // 2. UI validation
  // Check if description matches
  if (planData.description !== expected.ui.description) {
    notes.push(`UI description mismatch`)
    uiStatus = 'WARN'
  }

  // Note: Button text is hardcoded in PricingGrid component, we'll check that separately
  // For now, we'll validate that the plan structure supports the expected button text

  // 3. Feature enforcement validation
  // Check metadata for feature flags
  const metadata = planData.metadata || {}

  // Check rollover flag
  if (expected.features.rollover) {
    if (planData.rollover === 0 || planData.rollover === undefined) {
      notes.push(`Rollover feature expected but rollover is ${planData.rollover}`)
      featureStatus = 'FAIL'
    }
  } else {
    if (planData.rollover > 0) {
      notes.push(`Rollover feature not expected but rollover is ${planData.rollover}%`)
      featureStatus = 'WARN'
    }
  }

  // Helper to check if feature is present (including "Everything in X" cascades)
  const checkFeature = (featureName: string, keywords: string[], allPlans: any): boolean => {
    const features = planData.features || []
    const lowerFeatures = features.map((f: string) => f.toLowerCase())
    
    // Direct match
    if (lowerFeatures.some((f: string) => keywords.some((k) => f.includes(k)))) {
      return true
    }
    
    // Check for "Everything in X" cascades - recursively check lower tier
    const tierCascade: Record<string, string> = {
      core: 'starter',
      pro: 'core',
      team: 'pro',
      enterprise: 'team',
    }
    
    const planIdLower = planId.toLowerCase()
    if (tierCascade[planIdLower]) {
      const cascadeText = `everything in ${tierCascade[planIdLower]}`
      if (lowerFeatures.some((f: string) => f.includes(cascadeText))) {
        // Recursively check the lower tier
        const lowerTierData = allPlans[tierCascade[planIdLower]]
        if (lowerTierData?.features) {
          const lowerTierFeatures = lowerTierData.features.map((f: string) => f.toLowerCase())
          if (lowerTierFeatures.some((f: string) => keywords.some((k) => f.includes(k)))) {
            return true
          }
        }
      }
    }
    
    return false
  }

  // Check Smart Context (Pro+)
  if (expected.features.smartContext) {
    if (!checkFeature('Smart Context', ['smart context', '75%'], allPlans)) {
      notes.push(`Smart Context feature expected but not found in features list`)
      featureStatus = 'WARN'
    }
  }

  // Check Deep Reasoning (Team+)
  if (expected.features.deepReasoning) {
    if (!checkFeature('Deep Reasoning', ['deep reasoning'], allPlans)) {
      notes.push(`Deep Reasoning feature expected but not found in features list`)
      featureStatus = 'WARN'
    }
  }

  // Check Custom Templates (Core+)
  if (expected.features.customTemplates) {
    if (!checkFeature('Custom Templates', ['template', 'custom document'], allPlans)) {
      notes.push(`Custom Templates feature expected but not found in features list`)
      featureStatus = 'WARN'
    }
  }

  // Check Admin Dashboard (Team+)
  if (expected.features.adminDashboard) {
    if (!checkFeature('Admin Dashboard', ['admin', 'dashboard'], allPlans)) {
      notes.push(`Admin Dashboard feature expected but not found in features list`)
      featureStatus = 'WARN'
    }
  }

  // Check Compliance (Enterprise)
  if (expected.features.compliance) {
    if (!checkFeature('Compliance', ['compliance', 'audit'], allPlans)) {
      notes.push(`Compliance feature expected but not found in features list`)
      featureStatus = 'WARN'
    }
  }

  // Check Semantic Search (Pro+)
  if (expected.features.semanticSearch) {
    if (!checkFeature('Semantic Search', ['semantic search', 'semantic'], allPlans)) {
      notes.push(`Semantic Search feature expected but not found in features list`)
      featureStatus = 'WARN'
    }
  }

  return {
    plan: expected.name,
    config: configStatus,
    ui: uiStatus,
    featureEnforcement: featureStatus,
    notes,
  }
}

function getStatusEmoji(status: 'PASS' | 'WARN' | 'FAIL'): string {
  switch (status) {
    case 'PASS':
      return '✅ PASS'
    case 'WARN':
      return '⚠ WARN'
    case 'FAIL':
      return '❌ FAIL'
  }
}

function main() {
  console.log('🔍 Starting Plan Validation (Production QA)\n')

  // Load plans.json
  const plansPath = path.join(__dirname, '../config/plans.json')
  if (!fs.existsSync(plansPath)) {
    console.error(`❌ Error: plans.json not found at ${plansPath}`)
    process.exit(1)
  }

  const plansData = JSON.parse(fs.readFileSync(plansPath, 'utf-8'))
  const plans = plansData.tiers

  // Validate each plan
  const results: ValidationResult[] = []
  const planOrder = ['starter', 'core', 'pro', 'team', 'enterprise']

  for (const planId of planOrder) {
    const planData = plans[planId]
    const expected = EXPECTED_PLANS[planId]

    if (!planData) {
      results.push({
        plan: expected.name,
        config: 'FAIL',
        ui: 'FAIL',
        featureEnforcement: 'FAIL',
        notes: [`Plan "${planId}" not found in plans.json`],
      })
      continue
    }

    if (!expected) {
      results.push({
        plan: planId,
        config: 'FAIL',
        ui: 'FAIL',
        featureEnforcement: 'FAIL',
        notes: [`No expected definition for plan "${planId}"`],
      })
      continue
    }

    const result = validatePlan(planId, planData, expected, plans)
    results.push(result)
  }

  // Print results table
  console.log('## Validation Results\n')
  console.log('| Plan | Config | UI | Feature Enforcement | Notes |')
  console.log('|------|--------|----|----|-------|')

  for (const result of results) {
    const notesText = result.notes.length > 0 ? result.notes.join('; ') : '—'
    const notesDisplay = notesText.length > 50 ? notesText.substring(0, 47) + '...' : notesText

    console.log(
      `| ${result.plan} | ${getStatusEmoji(result.config)} | ${getStatusEmoji(result.ui)} | ${getStatusEmoji(result.featureEnforcement)} | ${notesDisplay} |`
    )
  }

  // Summary
  const totalPlans = results.length
  const fullyCorrect = results.filter(
    (r) => r.config === 'PASS' && r.ui === 'PASS' && r.featureEnforcement === 'PASS'
  ).length
  const totalIssues = results.reduce((sum, r) => sum + r.notes.length, 0)

  console.log('\n---\n')
  console.log(
    `**Validation complete:** ${fullyCorrect}/${totalPlans} plans fully correct, ${totalIssues} issues detected.\n`
  )

  // Detailed notes if any
  if (totalIssues > 0) {
    console.log('### Detailed Notes\n')
    for (const result of results) {
      if (result.notes.length > 0) {
        console.log(`#### ${result.plan}`)
        for (const note of result.notes) {
          console.log(`- ${note}`)
        }
        console.log('')
      }
    }
  }

  // Exit code
  const hasFailures = results.some((r) => r.config === 'FAIL' || r.ui === 'FAIL' || r.featureEnforcement === 'FAIL')
  process.exit(hasFailures ? 1 : 0)
}

main()

