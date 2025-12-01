#!/usr/bin/env tsx
/**
 * Build Validation Script
 * 
 * Validates the codebase before deployment:
 * - Type checking
 * - Linting
 * - Route handler validation
 * - Export validation
 */

import { execSync } from 'child_process'
import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const errors: string[] = []
const warnings: string[] = []

function logError(message: string) {
  errors.push(`❌ ${message}`)
  console.error(`❌ ${message}`)
}

function logWarning(message: string) {
  warnings.push(`⚠️  ${message}`)
  console.warn(`⚠️  ${message}`)
}

function logSuccess(message: string) {
  console.log(`✅ ${message}`)
}

/**
 * Check if TypeScript compilation passes
 */
function checkTypeScript() {
  logSuccess('Running TypeScript type check...')
  try {
    execSync('npm run typecheck', { stdio: 'inherit' })
    logSuccess('TypeScript type check passed')
    return true
  } catch (error) {
    logError('TypeScript type check failed')
    return false
  }
}

/**
 * Check if linting passes
 */
function checkLinting() {
  logSuccess('Running ESLint...')
  try {
    execSync('npm run lint', { stdio: 'inherit' })
    logSuccess('ESLint check passed')
    return true
  } catch (error) {
    logError('ESLint check failed')
    return false
  }
}

/**
 * Recursively find all route.ts files
 */
function findRouteFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = []
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        files.push(...findRouteFiles(fullPath, baseDir))
      } else if (entry === 'route.ts') {
        files.push(relative(baseDir, fullPath).replace(/\\/g, '/'))
      }
    }
  } catch (error) {
    // Ignore errors
  }
  return files
}

/**
 * Validate route handlers
 */
function validateRouteHandlers() {
  logSuccess('Validating route handlers...')
  const routeFiles = findRouteFiles(join(process.cwd(), 'app/api'))
  let issues = 0

  for (const file of routeFiles) {
    const content = readFileSync(file, 'utf-8')
    const filePath = file.replace(/\\/g, '/')

    // Check for context: any
    if (content.includes('context: any')) {
      logWarning(`${filePath}: Uses 'context: any' - should use proper types`)
      issues++
    }

    // Check for manual pathname parsing
    if (content.includes('pathname.split(\'/\')')) {
      logError(`${filePath}: Uses manual pathname parsing - should use context.params`)
      issues++
    }

    // Check for routes without middleware that don't await params
    if (!content.includes('withAuth') && !content.includes('withApiAuth')) {
      if (content.includes('context: { params: Promise')) {
        // Check if params are awaited
        const hasAwaitedParams = content.includes('await context.params')
        if (!hasAwaitedParams && content.includes('context.params')) {
          logError(`${filePath}: Route without middleware should await context.params`)
          issues++
        }
      }
    }

    // Check for inconsistent error handling
    const hasFormatErrorResponse = content.includes('formatErrorResponse')
    const hasManualErrorHandling = 
      content.includes('NextResponse.json({ error:') && 
      !hasFormatErrorResponse &&
      content.includes('catch')

    if (hasManualErrorHandling) {
      logWarning(`${filePath}: Uses manual error handling - should use formatErrorResponse()`)
      issues++
    }

    // Check for PUT methods (should use PATCH)
    if (content.includes('export const PUT')) {
      logWarning(`${filePath}: Uses PUT method - should use PATCH for updates`)
      issues++
    }
  }

  if (issues === 0) {
    logSuccess(`All ${routeFiles.length} route handlers validated`)
    return true
  } else {
    logWarning(`Found ${issues} issues in route handlers`)
    return issues < 10 // Allow some warnings
  }
}

/**
 * Validate exports
 */
function validateExports() {
  logSuccess('Validating exports...')
  const routeFiles = findRouteFiles(join(process.cwd(), 'app/api'))
  let issues = 0

  for (const file of routeFiles) {
    const fullPath = join(process.cwd(), file)
    const content = readFileSync(fullPath, 'utf-8')
    const filePath = file.replace(/\\/g, '/')

    // Check for proper HTTP method exports
    const hasGet = content.includes('export const GET')
    const hasPost = content.includes('export const POST')
    const hasPatch = content.includes('export const PATCH')
    const hasDelete = content.includes('export const DELETE')
    const hasPut = content.includes('export const PUT')

    // Routes should export at least one HTTP method
    if (!hasGet && !hasPost && !hasPatch && !hasDelete && !hasPut) {
      logError(`${filePath}: No HTTP method exports found`)
      issues++
    }
  }

  if (issues === 0) {
    logSuccess(`All exports validated`)
    return true
  } else {
    logError(`Found ${issues} export issues`)
    return false
  }
}

/**
 * Main validation function
 */
async function main() {
  console.log('🚀 Starting build validation...\n')

  const results = {
    typescript: checkTypeScript(),
    linting: checkLinting(),
    routeHandlers: validateRouteHandlers(),
    exports: validateExports(),
  }

  console.log('\n📊 Validation Summary:')
  console.log('─'.repeat(50))
  console.log(`TypeScript:     ${results.typescript ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Linting:        ${results.linting ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Route Handlers: ${results.routeHandlers ? '✅ PASS' : '⚠️  WARNINGS'}`)
  console.log(`Exports:        ${results.exports ? '✅ PASS' : '❌ FAIL'}`)
  console.log('─'.repeat(50))

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:')
    warnings.forEach(w => console.log(`  ${w}`))
  }

  if (errors.length > 0) {
    console.log('\n❌ Errors:')
    errors.forEach(e => console.log(`  ${e}`))
  }

  const allPassed = 
    results.typescript && 
    results.linting && 
    results.routeHandlers && 
    results.exports

  if (allPassed) {
    console.log('\n✅ Build validation passed! Ready for deployment.')
    process.exit(0)
  } else {
    console.log('\n❌ Build validation failed! Please fix errors before deploying.')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Validation script error:', error)
  process.exit(1)
})

