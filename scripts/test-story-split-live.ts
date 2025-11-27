/**
 * Live Story Split Testing Script
 * 
 * Tests the story split feature end-to-end by:
 * 1. Creating test stories via database
 * 2. Calling the split service directly
 * 3. Querying database to verify results
 * 
 * Run with: node --import tsx scripts/test-story-split-live.ts
 * 
 * Note: Requires DATABASE_URL environment variable.
 *       Script will try to load from .env.local or .env files.
 */

// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'

// Try loading .env.local first, then .env
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

import { db } from '@/lib/db'
import { stories, storyLinks, projects, organizations, users } from '@/lib/db/schema'
import { storySplitService } from '@/lib/services/story-split.service'
import { storySplitAnalysisService } from '@/lib/services/story-split-analysis.service'
import { storySplitValidationService } from '@/lib/services/story-split-validation.service'
import { eq, and, desc } from 'drizzle-orm'
import { nanoid } from 'nanoid'

interface TestResult {
  scenario: string
  success: boolean
  parentStoryId: string
  childStoryIds: string[]
  errors: string[]
  data: any
}

const results: TestResult[] = []

async function getTestUser() {
  // Find a non-super-admin user for testing
  const testUsers = await db
    .select()
    .from(users)
    .where(eq(users.isActive, true))
    .limit(1)
  
  if (testUsers.length === 0) {
    throw new Error('No active users found. Please create a test user first.')
  }
  
  const user = testUsers[0]
  
  // Check if super admin (should NOT be)
  const SUPER_ADMIN_EMAILS = ['chrisjrobertson@outlook.com', 'chris@synqforge.com']
  const isSuperAdmin = user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase())
  
  if (isSuperAdmin) {
    console.log('⚠️  Warning: Test user is a super admin. Results may differ from normal user behavior.')
  }
  
  return user
}

async function getOrCreateTestProject(userId: string, orgId: string) {
  // Look for existing test project
  const existing = await db
    .select()
    .from(projects)
    .where(eq(projects.name, 'Story Split Test Project'))
    .limit(1)
  
  if (existing.length > 0) {
    return existing[0]
  }
  
  // Create new test project
  const projectId = nanoid()
  await db.insert(projects).values({
    id: projectId,
    organizationId: orgId,
    name: 'Story Split Test Project',
    description: 'Test project for story split feature testing',
    status: 'active',
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  
  return project
}

async function createTestStory(
  userId: string,
  projectId: string,
  orgId: string,
  title: string,
  description: string,
  acceptanceCriteria: string[],
  storyPoints: number
) {
  const storyId = nanoid()
  
  await db.insert(stories).values({
    id: storyId,
    organizationId: orgId,
    projectId: projectId,
    title,
    description,
    acceptanceCriteria,
    storyPoints,
    status: 'backlog',
    priority: 'medium',
    storyType: 'feature',
    aiGenerated: false,
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  
  const [story] = await db
    .select()
    .from(stories)
    .where(eq(stories.id, storyId))
    .limit(1)
  
  return story
}

async function scenarioA_BasicSplit() {
  console.log('\n' + '='.repeat(80))
  console.log('SCENARIO A: Basic Split, No Epic Conversion')
  console.log('='.repeat(80))
  
  try {
    const user = await getTestUser()
    const orgId = user.organizationId
    const project = await getOrCreateTestProject(user.id, orgId)
    
    // Step 1: Create parent story
    console.log('\n1. Creating parent story...')
    const parentStory = await createTestStory(
      user.id,
      project.id,
      orgId,
      'Story Split Test – Basic',
      'As a user, I want to test the story split feature. This is a comprehensive test of the basic splitting functionality. The story should split into multiple child stories without converting the parent to an epic.',
      [
        'User can create a parent story with multiple acceptance criteria',
        'User can split the story into child stories',
        'All acceptance criteria must be covered by child stories',
        'Parent story remains unchanged after split'
      ],
      8
    )
    
    console.log(`   ✓ Created parent story: ${parentStory.id}`)
    console.log(`   Title: ${parentStory.title}`)
    console.log(`   Story Points: ${parentStory.storyPoints}`)
    console.log(`   ACs: ${parentStory.acceptanceCriteria?.length || 0}`)
    
    // Step 2: Get split analysis
    console.log('\n2. Getting split analysis...')
    const analysis = storySplitAnalysisService.analyzeStoryForSplit({
      id: parentStory.id,
      title: parentStory.title || '',
      description: parentStory.description || null,
      acceptanceCriteria: Array.isArray(parentStory.acceptanceCriteria) 
        ? parentStory.acceptanceCriteria 
        : null,
      storyPoints: parentStory.storyPoints || null,
      status: parentStory.status || null,
    })
    
    console.log(`   ✓ Analysis complete`)
    console.log(`   INVEST Score: ${analysis.invest.score}/5`)
    console.log(`   Splitting Recommended: ${analysis.splittingRecommended}`)
    console.log(`   Blocking Reasons: ${analysis.blockingReasons.length}`)
    
    // Step 3: Create child stories
    console.log('\n3. Creating child stories...')
    const children = [
      {
        title: 'Child Story 1 - Create Parent Story',
        personaGoal: 'As a user, I want to create a parent story so that I can organize my work',
        description: 'This child story covers the creation of parent stories with multiple acceptance criteria. It ensures the basic functionality works correctly.',
        acceptanceCriteria: [
          'User can create a parent story with multiple acceptance criteria',
          'User can add acceptance criteria to the story'
        ],
        estimatePoints: 3,
        providesUserValue: true,
      },
      {
        title: 'Child Story 2 - Split Story Functionality',
        personaGoal: 'As a user, I want to split stories so that I can break down large stories',
        description: 'This child story covers the splitting functionality and ensures all acceptance criteria are covered. It validates that the parent story remains unchanged.',
        acceptanceCriteria: [
          'User can split the story into child stories',
          'All acceptance criteria must be covered by child stories',
          'Parent story remains unchanged after split'
        ],
        estimatePoints: 5,
        providesUserValue: true,
      },
    ]
    
    // Validate children
    const validation = storySplitValidationService.validateAllChildren(
      children,
      parentStory.acceptanceCriteria as string[]
    )
    
    console.log(`   ✓ Validation complete`)
    console.log(`   All Valid: ${validation.allValid}`)
    console.log(`   Coverage: ${validation.coverage.coveragePercentage}%`)
    console.log(`   Covered Criteria: ${validation.coverage.coveredCriteria.length}`)
    console.log(`   Uncovered Criteria: ${validation.coverage.uncoveredCriteria.length}`)
    
    if (!validation.allValid) {
      console.log('   ❌ Validation failed!')
      validation.results.forEach((r, i) => {
        if (!r.valid) {
          console.log(`   Child ${i + 1} errors:`, r.errors)
        }
      })
      throw new Error('Child validation failed')
    }
    
    if (validation.coverage.coveragePercentage < 100) {
      console.log('   ⚠️  Coverage < 100%')
      console.log('   Uncovered:', validation.coverage.uncoveredCriteria)
      throw new Error('Coverage validation failed')
    }
    
    // Step 4: Execute split
    console.log('\n4. Executing split...')
    const splitResult = await storySplitService.splitStoryTx(
      parentStory.id,
      user.id,
      {
        convertParentToEpic: false,
        children,
        investRationale: analysis.invest,
        spidrStrategy: analysis.spidr,
      }
    )
    
    console.log(`   ✓ Split complete`)
    console.log(`   Child Stories Created: ${splitResult.childStories.length}`)
    console.log(`   Links Created: ${splitResult.links.length}`)
    
    // Step 5: Verify results
    console.log('\n5. Verifying results...')
    
    // Get parent story after split
    const [parentAfter] = await db
      .select()
      .from(stories)
      .where(eq(stories.id, parentStory.id))
      .limit(1)
    
    console.log('\n   Parent Story After Split:')
    console.log(`   - ID: ${parentAfter.id}`)
    console.log(`   - Title: ${parentAfter.title}`)
    console.log(`   - Status: ${parentAfter.status}`)
    console.log(`   - Story Points: ${parentAfter.storyPoints}`)
    console.log(`   - Epic ID: ${parentAfter.epicId || 'null'}`)
    console.log(`   - Is Epic: ${parentAfter.isEpic}`)
    console.log(`   - Parent ID: ${parentAfter.parentId || 'null'}`)
    console.log(`   - Split From ID: ${parentAfter.splitFromId || 'null'}`)
    
    // Get child stories
    const childStories = await db
      .select()
      .from(stories)
      .where(eq(stories.splitFromId, parentStory.id))
      .orderBy(stories.createdAt)
    
    console.log(`\n   Child Stories (${childStories.length}):`)
    childStories.forEach((child, i) => {
      console.log(`\n   Child ${i + 1}:`)
      console.log(`   - ID: ${child.id}`)
      console.log(`   - Title: ${child.title}`)
      console.log(`   - Story Points: ${child.storyPoints}`)
      console.log(`   - Status: ${child.status}`)
      console.log(`   - Epic ID: ${child.epicId || 'null'}`)
      console.log(`   - Parent ID: ${child.parentId || 'null'}`)
      console.log(`   - Split From ID: ${child.splitFromId || 'null'}`)
      console.log(`   - ACs: ${Array.isArray(child.acceptanceCriteria) ? child.acceptanceCriteria.length : 0}`)
    })
    
    // Get story links
    const links = await db
      .select()
      .from(storyLinks)
      .where(
        and(
          eq(storyLinks.storyId, parentStory.id),
          eq(storyLinks.relation, 'split_child')
        )
      )
    
    console.log(`\n   Story Links (Parent → Children): ${links.length}`)
    links.forEach((link, i) => {
      console.log(`   Link ${i + 1}: ${link.storyId} → ${link.relatedStoryId} (${link.relation})`)
    })
    
    const reverseLinks = await db
      .select()
      .from(storyLinks)
      .where(
        and(
          eq(storyLinks.relatedStoryId, parentStory.id),
          eq(storyLinks.relation, 'split_parent')
        )
      )
    
    console.log(`\n   Story Links (Children → Parent): ${reverseLinks.length}`)
    
    results.push({
      scenario: 'A',
      success: true,
      parentStoryId: parentStory.id,
      childStoryIds: childStories.map(s => s.id),
      errors: [],
      data: {
        parentBefore: parentStory,
        parentAfter,
        children: childStories,
        links: [...links, ...reverseLinks],
        validation,
      },
    })
    
    console.log('\n   ✅ SCENARIO A COMPLETE')
    
  } catch (error: any) {
    console.error('\n   ❌ SCENARIO A FAILED:', error.message)
    results.push({
      scenario: 'A',
      success: false,
      parentStoryId: '',
      childStoryIds: [],
      errors: [error.message],
      data: null,
    })
  }
}

async function scenarioB_EpicConversion() {
  console.log('\n' + '='.repeat(80))
  console.log('SCENARIO B: Split WITH Epic Conversion')
  console.log('='.repeat(80))
  
  try {
    const user = await getTestUser()
    const orgId = user.organizationId
    const project = await getOrCreateTestProject(user.id, orgId)
    
    // Step 1: Create parent story
    console.log('\n1. Creating parent story...')
    const parentStory = await createTestStory(
      user.id,
      project.id,
      orgId,
      'Story Split Test – Convert to Epic',
      'As a user, I want to test epic conversion during story split. This story will be converted to an epic and linked to child stories. The conversion should clear the epic association and set the status to backlog.',
      [
        'User can create a story that will become an epic',
        'User can split the story with epic conversion enabled',
        'Parent story becomes an epic after split',
        'Child stories link to the epic via parentId',
        'All acceptance criteria are covered by children'
      ],
      13
    )
    
    console.log(`   ✓ Created parent story: ${parentStory.id}`)
    
    // Step 2: Get split analysis
    console.log('\n2. Getting split analysis...')
    const analysis = storySplitAnalysisService.analyzeStoryForSplit({
      id: parentStory.id,
      title: parentStory.title || '',
      description: parentStory.description || null,
      acceptanceCriteria: Array.isArray(parentStory.acceptanceCriteria) 
        ? parentStory.acceptanceCriteria 
        : null,
      storyPoints: parentStory.storyPoints || null,
      status: parentStory.status || null,
    })
    
    // Step 3: Create child stories
    console.log('\n3. Creating child stories...')
    const children = [
      {
        title: 'Child 1 - Story Creation',
        personaGoal: 'As a user, I want to create stories so that I can organize work',
        description: 'Covers story creation functionality',
        acceptanceCriteria: [
          'User can create a story that will become an epic'
        ],
        estimatePoints: 3,
        providesUserValue: true,
      },
      {
        title: 'Child 2 - Split with Epic Conversion',
        personaGoal: 'As a user, I want to split stories with epic conversion',
        description: 'Covers the split functionality with epic conversion enabled',
        acceptanceCriteria: [
          'User can split the story with epic conversion enabled',
          'Parent story becomes an epic after split'
        ],
        estimatePoints: 3,
        providesUserValue: true,
      },
      {
        title: 'Child 3 - Child Story Linking',
        personaGoal: 'As a user, I want child stories linked correctly',
        description: 'Ensures child stories link properly to the epic',
        acceptanceCriteria: [
          'Child stories link to the epic via parentId',
          'All acceptance criteria are covered by children'
        ],
        estimatePoints: 5,
        providesUserValue: true,
      },
    ]
    
    // Validate children
    const validation = storySplitValidationService.validateAllChildren(
      children,
      parentStory.acceptanceCriteria as string[]
    )
    
    if (!validation.allValid || validation.coverage.coveragePercentage < 100) {
      throw new Error('Validation failed')
    }
    
    // Step 4: Execute split with epic conversion
    console.log('\n4. Executing split with epic conversion...')
    const splitResult = await storySplitService.splitStoryTx(
      parentStory.id,
      user.id,
      {
        convertParentToEpic: true,
        children,
        investRationale: analysis.invest,
        spidrStrategy: analysis.spidr,
      }
    )
    
    console.log(`   ✓ Split complete`)
    
    // Step 5: Verify results
    console.log('\n5. Verifying results...')
    
    // Get parent story after split (should be epic now)
    const [parentAfter] = await db
      .select()
      .from(stories)
      .where(eq(stories.id, parentStory.id))
      .limit(1)
    
    console.log('\n   Parent Story (Now Epic) After Split:')
    console.log(`   - ID: ${parentAfter.id}`)
    console.log(`   - Title: ${parentAfter.title}`)
    console.log(`   - Is Epic: ${parentAfter.isEpic}`)
    console.log(`   - Status: ${parentAfter.status}`)
    console.log(`   - Epic ID: ${parentAfter.epicId || 'null'}`)
    console.log(`   - Parent ID: ${parentAfter.parentId || 'null'}`)
    console.log(`   - Split From ID: ${parentAfter.splitFromId || 'null'}`)
    
    // Get child stories
    const childStories = await db
      .select()
      .from(stories)
      .where(eq(stories.splitFromId, parentStory.id))
      .orderBy(stories.createdAt)
    
    console.log(`\n   Child Stories (${childStories.length}):`)
    childStories.forEach((child, i) => {
      console.log(`\n   Child ${i + 1}:`)
      console.log(`   - ID: ${child.id}`)
      console.log(`   - Title: ${child.title}`)
      console.log(`   - Story Points: ${child.storyPoints}`)
      console.log(`   - Status: ${child.status}`)
      console.log(`   - Epic ID: ${child.epicId || 'null'}`)
      console.log(`   - Parent ID: ${child.parentId || 'null'}`)
      console.log(`   - Split From ID: ${child.splitFromId || 'null'}`)
    })
    
    results.push({
      scenario: 'B',
      success: true,
      parentStoryId: parentStory.id,
      childStoryIds: childStories.map(s => s.id),
      errors: [],
      data: {
        parentBefore: parentStory,
        parentAfter,
        children: childStories,
      },
    })
    
    console.log('\n   ✅ SCENARIO B COMPLETE')
    
  } catch (error: any) {
    console.error('\n   ❌ SCENARIO B FAILED:', error.message)
    results.push({
      scenario: 'B',
      success: false,
      parentStoryId: '',
      childStoryIds: [],
      errors: [error.message],
      data: null,
    })
  }
}

async function scenarioC_CoverageValidation() {
  console.log('\n' + '='.repeat(80))
  console.log('SCENARIO C: Coverage Validation')
  console.log('='.repeat(80))
  
  try {
    const user = await getTestUser()
    const orgId = user.organizationId
    const project = await getOrCreateTestProject(user.id, orgId)
    
    // Step 1: Create parent story
    console.log('\n1. Creating parent story...')
    const parentStory = await createTestStory(
      user.id,
      project.id,
      orgId,
      'Story Split Test – Coverage',
      'As a user, I want to test coverage validation. This story has 3 acceptance criteria, but we will only cover 2 of them.',
      [
        'First acceptance criterion must be covered',
        'Second acceptance criterion must be covered',
        'Third acceptance criterion should be missing'
      ],
      5
    )
    
    console.log(`   ✓ Created parent story: ${parentStory.id}`)
    
    // Step 2: Create children with incomplete coverage
    console.log('\n2. Creating children with incomplete coverage...')
    const children = [
      {
        title: 'Child 1 - Covers First AC',
        personaGoal: 'As a user, I want the first AC covered',
        description: 'This child covers the first acceptance criterion',
        acceptanceCriteria: [
          'First acceptance criterion must be covered'
        ],
        estimatePoints: 2,
        providesUserValue: true,
      },
      {
        title: 'Child 2 - Covers Second AC',
        personaGoal: 'As a user, I want the second AC covered',
        description: 'This child covers the second acceptance criterion',
        acceptanceCriteria: [
          'Second acceptance criterion must be covered'
        ],
        estimatePoints: 3,
        providesUserValue: true,
      },
      // Intentionally missing the third AC
    ]
    
    // Step 3: Validate (should fail)
    console.log('\n3. Validating children (should show incomplete coverage)...')
    const validation = storySplitValidationService.validateAllChildren(
      children,
      parentStory.acceptanceCriteria as string[]
    )
    
    console.log(`   Coverage: ${validation.coverage.coveragePercentage}%`)
    console.log(`   Covered: ${validation.coverage.coveredCriteria.length}`)
    console.log(`   Uncovered: ${validation.coverage.uncoveredCriteria.length}`)
    console.log(`   Uncovered Criteria:`, validation.coverage.uncoveredCriteria)
    
    if (validation.coverage.coveragePercentage === 100) {
      console.log('   ⚠️  WARNING: Coverage is 100% but should be < 100%')
    }
    
    // Step 4: Try to execute split (should fail for non-super-admin)
    console.log('\n4. Attempting split (should fail for non-super-admin)...')
    
    const SUPER_ADMIN_EMAILS = ['chrisjrobertson@outlook.com', 'chris@synqforge.com']
    const isSuperAdmin = user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase())
    
    if (isSuperAdmin) {
      console.log('   ⚠️  User is super admin - split will proceed despite incomplete coverage')
      // Super admin can proceed
      const splitResult = await storySplitService.splitStoryTx(
        parentStory.id,
        user.id,
        {
          convertParentToEpic: false,
          children,
        }
      )
      console.log('   ✓ Split completed (super admin bypass)')
    } else {
      // Try to execute - should fail
      try {
        await storySplitService.splitStoryTx(
          parentStory.id,
          user.id,
          {
            convertParentToEpic: false,
            children,
          }
        )
        console.log('   ⚠️  WARNING: Split succeeded but should have failed!')
      } catch (error: any) {
        console.log(`   ✓ Split correctly blocked: ${error.message}`)
      }
    }
    
    results.push({
      scenario: 'C',
      success: true,
      parentStoryId: parentStory.id,
      childStoryIds: [],
      errors: [],
      data: {
        validation,
        coveragePercentage: validation.coverage.coveragePercentage,
        uncoveredCriteria: validation.coverage.uncoveredCriteria,
        isSuperAdmin,
      },
    })
    
    console.log('\n   ✅ SCENARIO C COMPLETE')
    
  } catch (error: any) {
    console.error('\n   ❌ SCENARIO C FAILED:', error.message)
    results.push({
      scenario: 'C',
      success: false,
      parentStoryId: '',
      childStoryIds: [],
      errors: [error.message],
      data: null,
    })
  }
}

async function generateSQLQueries() {
  console.log('\n' + '='.repeat(80))
  console.log('SQL VERIFICATION QUERIES')
  console.log('='.repeat(80))
  
  for (const result of results) {
    if (result.success && result.parentStoryId) {
      console.log(`\n-- Scenario ${result.scenario} - Parent Story ID: ${result.parentStoryId}`)
      console.log(`\n-- Get parent story`)
      console.log(`SELECT id, title, is_epic, status, epic_id, parent_id, split_from_id, story_points`)
      console.log(`FROM stories`)
      console.log(`WHERE id = '${result.parentStoryId}';`)
      
      if (result.childStoryIds.length > 0) {
        console.log(`\n-- Get child stories`)
        console.log(`SELECT id, title, parent_id, split_from_id, epic_id, story_points, status`)
        console.log(`FROM stories`)
        console.log(`WHERE split_from_id = '${result.parentStoryId}'`)
        console.log(`ORDER BY created_at;`)
        
        console.log(`\n-- Get story links`)
        console.log(`SELECT story_id, related_story_id, relation`)
        console.log(`FROM story_links`)
        console.log(`WHERE story_id = '${result.parentStoryId}' OR related_story_id = '${result.parentStoryId}'`)
        console.log(`ORDER BY relation, created_at;`)
      }
    }
  }
}

async function main() {
  console.log('='.repeat(80))
  console.log('STORY SPLIT LIVE TESTING')
  console.log('='.repeat(80))
  console.log('\nThis script tests the story split feature end-to-end.')
  console.log('It creates test stories and executes splits, then verifies results.\n')
  
  try {
    // Check database connection
    await db.select().from(users).limit(1)
    console.log('✓ Database connection successful\n')
    
    // Run scenarios
    await scenarioA_BasicSplit()
    await scenarioB_EpicConversion()
    await scenarioC_CoverageValidation()
    
    // Generate SQL queries
    await generateSQLQueries()
    
    // Summary
    console.log('\n' + '='.repeat(80))
    console.log('TEST SUMMARY')
    console.log('='.repeat(80))
    
    results.forEach(r => {
      const status = r.success ? '✅ PASS' : '❌ FAIL'
      console.log(`\nScenario ${r.scenario}: ${status}`)
      if (r.errors.length > 0) {
        console.log(`  Errors: ${r.errors.join(', ')}`)
      }
      if (r.parentStoryId) {
        console.log(`  Parent Story ID: ${r.parentStoryId}`)
      }
      if (r.childStoryIds.length > 0) {
        console.log(`  Child Story IDs: ${r.childStoryIds.join(', ')}`)
      }
    })
    
    console.log('\n' + '='.repeat(80))
    console.log('Testing complete!')
    console.log('='.repeat(80))
    
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()

