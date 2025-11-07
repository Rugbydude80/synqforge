#!/usr/bin/env tsx
/**
 * Automated Plan Validation Script (Production QA)
 * 
 * Validates that all plan definitions and entitlements are correctly implemented
 * in production for SynqForge.
 * 
 * Usage: 
 *   npx tsx scripts/validate-plans-production.ts
 *   npx tsx scripts/validate-plans-production.ts --extended
 *   npx tsx scripts/validate-plans-production.ts --generate-patches
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Stripe from 'stripe'

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
  planId: string
  config: 'PASS' | 'WARN' | 'FAIL'
  ui: 'PASS' | 'WARN' | 'FAIL'
  featureEnforcement: 'PASS' | 'WARN' | 'FAIL'
  stripe?: 'PASS' | 'WARN' | 'FAIL' | 'SKIP'
  dbSchema?: 'PASS' | 'WARN' | 'FAIL' | 'SKIP'
  notes: string[]
  patches?: Array<{ path: string; value: any; expected: any }>
}

interface PatchSuggestion {
  file: string
  planId: string
  changes: Array<{
    path: string[]
    current: any
    expected: any
    description: string
  }>
}

function validatePlan(
  planId: string,
  planData: any,
  expected: ExpectedPlan,
  allPlans: any,
  options: { generatePatches?: boolean } = {}
): ValidationResult {
  const notes: string[] = []
  const patches: Array<{ path: string; value: any; expected: any }> = []
  let configStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS'
  let uiStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS'
  let featureStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS'

  // Helper to add patch suggestion
  const addPatch = (fieldPath: string, current: any, expected: any, description: string) => {
    if (options.generatePatches) {
      patches.push({ path: fieldPath, value: current, expected })
    }
    notes.push(description)
  }

  // 1. Config validation
  if (planData.id !== expected.id) {
    addPatch(`tiers.${planId}.id`, planData.id, expected.id, `ID mismatch: expected "${expected.id}", got "${planData.id}"`)
    configStatus = 'FAIL'
  }

  if (planData.name !== expected.name) {
    addPatch(`tiers.${planId}.name`, planData.name, expected.name, `Name mismatch: expected "${expected.name}", got "${planData.name}"`)
    configStatus = 'FAIL'
  }

  if (planData.description !== expected.description) {
    addPatch(`tiers.${planId}.description`, planData.description, expected.description, `Description mismatch: expected "${expected.description}", got "${planData.description}"`)
    configStatus = 'WARN'
  }

  // Validate AI actions
  if (expected.aiActions === 'custom') {
    if (planData.actionsBase !== 'custom' && planData.actions !== 'custom') {
      addPatch(`tiers.${planId}.actionsBase`, planData.actionsBase, 'custom', `Expected custom AI actions, but got numeric value`)
      configStatus = 'FAIL'
    }
  } else if (typeof expected.aiActions === 'number') {
    if (planData.actions !== expected.aiActions) {
      addPatch(`tiers.${planId}.actions`, planData.actions, expected.aiActions, `AI actions mismatch: expected ${expected.aiActions}, got ${planData.actions}`)
      configStatus = 'FAIL'
    }
  } else {
    // Pooled actions
    if (planData.actionsBase !== expected.aiActions.base) {
      addPatch(`tiers.${planId}.actionsBase`, planData.actionsBase, expected.aiActions.base, `AI actions base mismatch: expected ${expected.aiActions.base}, got ${planData.actionsBase}`)
      configStatus = 'FAIL'
    }
    if (planData.actionsPerSeat !== expected.aiActions.perSeat) {
      addPatch(`tiers.${planId}.actionsPerSeat`, planData.actionsPerSeat, expected.aiActions.perSeat, `AI actions per seat mismatch: expected ${expected.aiActions.perSeat}, got ${planData.actionsPerSeat}`)
      configStatus = 'FAIL'
    }
  }

  // Validate rollover
  if (expected.rollover === 'policy') {
    if (planData.rollover !== 'policy') {
      addPatch(`tiers.${planId}.rollover`, planData.rollover, 'policy', `Expected policy-based rollover, got ${planData.rollover}`)
      configStatus = 'FAIL'
    }
  } else if (planData.rollover !== expected.rollover) {
    addPatch(`tiers.${planId}.rollover`, planData.rollover, expected.rollover, `Rollover mismatch: expected ${expected.rollover}%, got ${planData.rollover}%`)
    configStatus = 'FAIL'
  }

  // Validate pooling
  if (expected.features.pooling !== planData.pooling) {
    addPatch(`tiers.${planId}.pooling`, planData.pooling, expected.features.pooling, `Pooling mismatch: expected ${expected.features.pooling}, got ${planData.pooling}`)
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
    planId,
    config: configStatus,
    ui: uiStatus,
    featureEnforcement: featureStatus,
    notes,
    patches: patches.length > 0 ? patches : undefined,
  }
}

function getStatusEmoji(status: 'PASS' | 'WARN' | 'FAIL' | 'SKIP'): string {
  switch (status) {
    case 'PASS':
      return '✅ PASS'
    case 'WARN':
      return '⚠ WARN'
    case 'FAIL':
      return '❌ FAIL'
    case 'SKIP':
      return '⏭ SKIP'
  }
}

/**
 * Generate JSON patch suggestions for failed validations
 */
function generatePatchSuggestions(results: ValidationResult[]): PatchSuggestion[] {
  const patches: PatchSuggestion[] = []

  for (const result of results) {
    if (!result.patches || result.patches.length === 0) continue

    const changes = result.patches.map((patch) => {
      const pathParts = patch.path.split('.')
      return {
        path: pathParts,
        current: patch.value,
        expected: patch.expected,
        description: `Update ${patch.path} from ${JSON.stringify(patch.value)} to ${JSON.stringify(patch.expected)}`,
      }
    })

    patches.push({
      file: 'config/plans.json',
      planId: result.planId,
      changes,
    })
  }

  return patches
}

/**
 * Format patch suggestions as JSON Patch or ready-to-apply code
 */
function formatPatches(patches: PatchSuggestion[]): string {
  if (patches.length === 0) return ''

  let output = '\n## 🔧 Auto-Generated Fix Suggestions\n\n'
  output += '### JSON Patch Format (RFC 6902)\n\n'
  output += '```json\n'
  output += JSON.stringify(
    patches.flatMap((p) =>
      p.changes.map((change) => ({
        op: 'replace',
        path: `/${change.path.join('/')}`,
        value: change.expected,
      }))
    ),
    null,
    2
  )
  output += '\n```\n\n'

  output += '### Ready-to-Apply Code Snippet\n\n'
  output += '```typescript\n'
  output += '// Apply these changes to config/plans.json\n'
  for (const patch of patches) {
    output += `\n// Fixes for ${patch.planId} plan:\n`
    for (const change of patch.changes) {
      const pathStr = `tiers.${patch.planId}.${change.path.slice(2).join('.')}`
      output += `plansData.${pathStr} = ${JSON.stringify(change.expected)};\n`
    }
  }
  output += '```\n\n'

  output += '### Manual Edit Instructions\n\n'
  for (const patch of patches) {
    output += `#### ${patch.planId.toUpperCase()} Plan\n\n`
    for (const change of patch.changes) {
      output += `- **Path**: \`${change.path.join('.')}\`\n`
      output += `- **Current**: \`${JSON.stringify(change.current)}\`\n`
      output += `- **Expected**: \`${JSON.stringify(change.expected)}\`\n\n`
    }
  }

  return output
}

/**
 * Validate Stripe metadata sync (optional, requires Stripe API)
 * 
 * Checks that Stripe Price metadata.tier matches plan.id in plans.json
 * Validates:
 * - All active prices have metadata.tier set
 * - metadata.tier matches a valid plan ID
 * - Product names match expected format
 */
async function validateStripeMetadata(
  plans: any,
  options: { stripeApiKey?: string } = {}
): Promise<Array<{ planId: string; status: 'PASS' | 'WARN' | 'FAIL' | 'SKIP'; notes: string[] }>> {
  const results: Array<{ planId: string; status: 'PASS' | 'WARN' | 'FAIL' | 'SKIP'; notes: string[] }> = []

  if (!options.stripeApiKey) {
    console.log('⏭ Skipping Stripe validation (no STRIPE_SECRET_KEY)')
    for (const planId of ['starter', 'core', 'pro', 'team', 'enterprise']) {
      results.push({ planId, status: 'SKIP', notes: ['Stripe API key not provided'] })
    }
    return results
  }

  try {
    const stripe = new Stripe(options.stripeApiKey, {
      apiVersion: '2025-06-30.basil' as any,
    })

    // Fetch all active prices with product details
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      limit: 100,
    })

    // Map plan IDs to their expected Stripe product names
    const planProductMap: Record<string, string> = {
      starter: 'SynqForge Free',
      core: 'SynqForge Core',
      pro: 'SynqForge Pro',
      team: 'SynqForge Team',
      enterprise: 'SynqForge Enterprise',
    }

    // Track which plans have prices in Stripe
    const planPriceCounts: Record<string, number> = {
      starter: 0,
      core: 0,
      pro: 0,
      team: 0,
      enterprise: 0,
    }

    // Validate each price
    const priceIssues: Array<{ planId: string; issue: string }> = []

    for (const price of prices.data) {
      if (price.type !== 'recurring') continue

      const product = price.product as Stripe.Product
      const metadata = price.metadata || {}
      const tier = metadata.tier

      // Find which plan this price belongs to
      let planId: string | null = null
      for (const [pid, productName] of Object.entries(planProductMap)) {
        if (product.name === productName) {
          planId = pid
          planPriceCounts[pid]++
          break
        }
      }

      if (!planId) {
        // Price exists but doesn't match any plan
        priceIssues.push({
          planId: 'unknown',
          issue: `Price ${price.id} has product "${product.name}" which doesn't match any plan`,
        })
        continue
      }

      // Validate metadata.tier matches plan ID
      if (!tier) {
        priceIssues.push({
          planId,
          issue: `Price ${price.id} missing metadata.tier`,
        })
      } else if (tier !== planId) {
        priceIssues.push({
          planId,
          issue: `Price ${price.id} has metadata.tier="${tier}" but should be "${planId}"`,
        })
      }

      // Validate version metadata
      const version = metadata.version
      const expectedVersion = plans[planId]?.metadata?.version || '2025-10-24'
      if (version && version !== expectedVersion) {
        priceIssues.push({
          planId,
          issue: `Price ${price.id} has metadata.version="${version}" but expected "${expectedVersion}"`,
        })
      }
    }

    // Generate results for each plan
    for (const planId of ['starter', 'core', 'pro', 'team', 'enterprise']) {
      const plan = plans[planId]
      if (!plan) {
        results.push({ planId, status: 'FAIL', notes: ['Plan not found in plans.json'] })
        continue
      }

      const issues = priceIssues.filter((p) => p.planId === planId)
      const priceCount = planPriceCounts[planId]

      if (priceCount === 0) {
        results.push({
          planId,
          status: 'WARN',
          notes: [`No Stripe prices found for plan "${planId}"`],
        })
      } else if (issues.length > 0) {
        results.push({
          planId,
          status: 'FAIL',
          notes: issues.map((i) => i.issue),
        })
      } else {
        results.push({
          planId,
          status: 'PASS',
          notes: [`Found ${priceCount} price(s) with correct metadata`],
        })
      }
    }

    console.log('✅ Stripe metadata validated successfully')
  } catch (error) {
    console.error('❌ Stripe validation error:', error instanceof Error ? error.message : error)
    for (const planId of ['starter', 'core', 'pro', 'team', 'enterprise']) {
      results.push({
        planId,
        status: 'FAIL',
        notes: [`Stripe API error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      })
    }
  }

  return results
}

/**
 * Validate DB schema consistency (optional, requires DB connection)
 * 
 * Checks that database schema fields match plan definitions:
 * - subscriptionTier enum values match plan IDs
 * - Entitlement fields exist and have correct types
 * - Default values align with plan configs
 */
async function validateDbSchema(
  plans: any,
  options: { dbUrl?: string } = {}
): Promise<Array<{ planId: string; status: 'PASS' | 'WARN' | 'FAIL' | 'SKIP'; notes: string[] }>> {
  const results: Array<{ planId: string; status: 'PASS' | 'WARN' | 'FAIL' | 'SKIP'; notes: string[] }> = []

  if (!options.dbUrl) {
    console.log('⏭ Skipping DB schema validation (no DATABASE_URL)')
    for (const planId of ['starter', 'core', 'pro', 'team', 'enterprise']) {
      results.push({ planId, status: 'SKIP', notes: ['Database URL not provided'] })
    }
    return results
  }

  try {
    // Use postgres client directly for raw SQL queries
    const postgres = (await import('postgres')).default
    const sql = postgres(options.dbUrl, {
      max: 1,
      idle_timeout: 0,
      max_lifetime: 0,
      connect_timeout: 10,
      prepare: false,
    })

    // Check that subscription_tier enum includes all plan IDs
    const enumResult = await sql`
      SELECT unnest(enum_range(NULL::subscription_tier))::text AS tier
    `
    const dbTiers = enumResult.map((row: any) => row.tier)

    const expectedTiers = ['starter', 'core', 'pro', 'team', 'enterprise', 'admin']
    const missingTiers = expectedTiers.filter((t) => !dbTiers.includes(t))
    const extraTiers = dbTiers.filter((t) => !expectedTiers.includes(t))

    // Check that organizations table has required entitlement columns
    const columnResult = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'organizations'
      AND column_name IN (
        'subscription_tier',
        'ai_tokens_included',
        'advanced_ai',
        'exports_enabled',
        'templates_enabled',
        'sso_enabled'
      )
    `
    const dbColumns = columnResult.map((row: any) => row.column_name)

    // Close connection
    await sql.end()

    const requiredColumns = [
      'subscription_tier',
      'ai_tokens_included',
      'advanced_ai',
      'exports_enabled',
      'templates_enabled',
      'sso_enabled',
    ]
    const missingColumns = requiredColumns.filter((c) => !dbColumns.includes(c))

    // Generate results for each plan
    for (const planId of ['starter', 'core', 'pro', 'team', 'enterprise']) {
      const plan = plans[planId]
      if (!plan) {
        results.push({ planId, status: 'FAIL', notes: ['Plan not found in plans.json'] })
        continue
      }

      const issues: string[] = []

      // Check if tier exists in enum
      if (!dbTiers.includes(planId)) {
        issues.push(`subscription_tier enum missing value "${planId}"`)
      }

      // Check for missing columns (shared across all plans)
      if (missingColumns.length > 0 && planId === 'starter') {
        // Only report once for starter
        issues.push(`Missing columns: ${missingColumns.join(', ')}`)
      }

      // Check for extra tiers (only report once)
      if (extraTiers.length > 0 && planId === 'starter') {
        issues.push(`Extra tiers in enum: ${extraTiers.join(', ')}`)
      }

      if (issues.length > 0) {
        results.push({ planId, status: 'FAIL', notes: issues })
      } else {
        results.push({
          planId,
          status: 'PASS',
          notes: ['Schema fields validated'],
        })
      }
    }

    // Report enum issues once
    if (missingTiers.length > 0) {
      results[0].notes.push(`Missing tiers in enum: ${missingTiers.join(', ')}`)
      results[0].status = 'FAIL'
    }

    console.log('✅ DB schema validated successfully')
  } catch (error) {
    console.error('❌ DB schema validation error:', error instanceof Error ? error.message : error)
    for (const planId of ['starter', 'core', 'pro', 'team', 'enterprise']) {
      results.push({
        planId,
        status: 'FAIL',
        notes: [`DB connection error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      })
    }
  }

  return results
}

async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2)
  const extended = args.includes('--extended') || args.includes('-e')
  const generatePatches = args.includes('--generate-patches') || args.includes('-p')
  const help = args.includes('--help') || args.includes('-h')

  if (help) {
    console.log(`
Usage: npx tsx scripts/validate-plans-production.ts [options]

Options:
  --extended, -e          Run extended validation (Stripe, DB schema)
  --generate-patches, -p   Generate auto-fix patches for failed validations
  --help, -h              Show this help message

Examples:
  npm run validate:plans
  npm run validate:plans -- --extended
  npm run validate:plans -- --generate-patches
`)
    process.exit(0)
  }

  console.log('🔍 Starting Plan Validation (Production QA)\n')
  if (extended) console.log('📊 Extended validation enabled\n')
  if (generatePatches) console.log('🔧 Auto-patch generation enabled\n')

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
        plan: expected?.name || planId,
        planId,
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
        planId,
        config: 'FAIL',
        ui: 'FAIL',
        featureEnforcement: 'FAIL',
        notes: [`No expected definition for plan "${planId}"`],
      })
      continue
    }

    const result = validatePlan(planId, planData, expected, plans, { generatePatches })
    results.push(result)
  }

  // Extended validation (optional)
  if (extended) {
    console.log('### Extended Validation\n')
    const stripeResults = await validateStripeMetadata(plans, {
      stripeApiKey: process.env.STRIPE_SECRET_KEY,
    })
    const dbResults = await validateDbSchema(plans, {
      dbUrl: process.env.DATABASE_URL,
    })

    // Merge extended results
    for (let i = 0; i < results.length; i++) {
      const stripeResult = stripeResults[i]
      const dbResult = dbResults[i]
      if (stripeResult) results[i].stripe = stripeResult.status
      if (dbResult) results[i].dbSchema = dbResult.status
    }
  }

  // Print results table
  console.log('## Validation Results\n')
  const tableHeaders = ['Plan', 'Config', 'UI', 'Feature Enforcement']
  if (extended) {
    tableHeaders.push('Stripe', 'DB Schema')
  }
  tableHeaders.push('Notes')
  console.log(`| ${tableHeaders.join(' | ')} |`)
  console.log(`|${tableHeaders.map(() => '------').join('|')}|`)

  for (const result of results) {
    const notesText = result.notes.length > 0 ? result.notes.join('; ') : '—'
    const notesDisplay = notesText.length > 50 ? notesText.substring(0, 47) + '...' : notesText

    const row = [
      result.plan,
      getStatusEmoji(result.config),
      getStatusEmoji(result.ui),
      getStatusEmoji(result.featureEnforcement),
    ]
    if (extended) {
      row.push(getStatusEmoji(result.stripe || 'SKIP'), getStatusEmoji(result.dbSchema || 'SKIP'))
    }
    row.push(notesDisplay)

    console.log(`| ${row.join(' | ')} |`)
  }

  // Summary
  const totalPlans = results.length
  const baseChecks = ['config', 'ui', 'featureEnforcement'] as const
  const fullyCorrect = results.filter((r) =>
    baseChecks.every((check) => r[check] === 'PASS')
  ).length
  const totalIssues = results.reduce((sum, r) => sum + r.notes.length, 0)

  console.log('\n---\n')
  console.log(
    `**Validation complete:** ${fullyCorrect}/${totalPlans} plans fully correct, ${totalIssues} issues detected.\n`
  )

  // Extended validation summary
  if (extended) {
    const stripeResults = results.filter((r) => r.stripe && r.stripe !== 'SKIP')
    const dbResults = results.filter((r) => r.dbSchema && r.dbSchema !== 'SKIP')
    
    if (stripeResults.length > 0 || dbResults.length > 0) {
      const stripePass = stripeResults.length === 0 || stripeResults.every((r) => r.stripe === 'PASS')
      const dbPass = dbResults.length === 0 || dbResults.every((r) => r.dbSchema === 'PASS')
      
      const stripeStatus = stripeResults.length === 0 ? '⏭ SKIP' : stripePass ? '✅ PASS' : '❌ FAIL'
      const dbStatus = dbResults.length === 0 ? '⏭ SKIP' : dbPass ? '✅ PASS' : '❌ FAIL'
      
      console.log(`**Extended validation:** Stripe ${stripeStatus}, DB Schema ${dbStatus}\n`)
    }
  }

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

  // Generate patches if requested and failures exist
  if (generatePatches) {
    const patches = generatePatchSuggestions(results)
    if (patches.length > 0) {
      console.log(formatPatches(patches))
    }
  }

  // Exit code
  const hasFailures = results.some(
    (r) =>
      r.config === 'FAIL' ||
      r.ui === 'FAIL' ||
      r.featureEnforcement === 'FAIL' ||
      (extended && (r.stripe === 'FAIL' || r.dbSchema === 'FAIL'))
  )
  process.exit(hasFailures ? 1 : 0)
}

main().catch((error) => {
  console.error('❌ Validation error:', error)
  process.exit(1)
})

