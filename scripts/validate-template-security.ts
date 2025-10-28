#!/usr/bin/env tsx

/**
 * Template Security Validation Script
 * 
 * Run this to verify that:
 * 1. Templates are properly configured
 * 2. No system prompts are leaked in metadata
 * 3. Access control is working
 */

import { 
  getTemplateMetadata, 
  getSystemPromptForTemplate,
  validateTemplateAccess,
  getDefaultTemplateKey
} from '../lib/ai/prompt-templates';

console.log('🔒 Validating Prompt Template Security...\n');

// Test 1: Verify metadata doesn't leak prompts
console.log('Test 1: Checking metadata for prompt leakage...');
const publicTemplates = getTemplateMetadata(false);
const adminTemplates = getTemplateMetadata(true);

let leakageFound = false;
[...publicTemplates, ...adminTemplates].forEach(template => {
  const templateStr = JSON.stringify(template);
  
  if (templateStr.includes('systemPrompt')) {
    console.error(`❌ SECURITY ISSUE: Template ${template.key} exposes systemPrompt in metadata`);
    leakageFound = true;
  }
  
  if (templateStr.toLowerCase().includes('you are an expert')) {
    console.error(`❌ SECURITY ISSUE: Template ${template.key} leaks prompt text in metadata`);
    leakageFound = true;
  }
});

if (!leakageFound) {
  console.log('✅ No prompt leakage detected in metadata\n');
} else {
  console.error('❌ SECURITY VULNERABILITY DETECTED!\n');
  process.exit(1);
}

// Test 2: Verify templates are accessible
console.log('Test 2: Checking template accessibility...');
const expectedTemplates = ['standard', 'lean-agile', 'bdd-compliance', 'enterprise', 'technical-focus', 'ux-focused'];

expectedTemplates.forEach(key => {
  const prompt = getSystemPromptForTemplate(key);
  if (!prompt || prompt.length < 100) {
    console.error(`❌ Template ${key} has invalid or missing system prompt`);
    process.exit(1);
  }
});

console.log(`✅ All ${expectedTemplates.length} templates have valid system prompts\n`);

// Test 3: Verify access control
console.log('Test 3: Checking access control...');

// Standard template should be accessible to all
const standardAccess = validateTemplateAccess('standard', false);
if (!standardAccess.valid) {
  console.error('❌ Standard template should be accessible to all users');
  process.exit(1);
}

// Enterprise template should be blocked for non-admin
const enterpriseAccessNonAdmin = validateTemplateAccess('enterprise', false);
if (enterpriseAccessNonAdmin.valid) {
  console.error('❌ SECURITY ISSUE: Enterprise template accessible to non-admin users');
  process.exit(1);
}

// Enterprise template should be accessible to admin
const enterpriseAccessAdmin = validateTemplateAccess('enterprise', true);
if (!enterpriseAccessAdmin.valid) {
  console.error('❌ Enterprise template should be accessible to admin users');
  process.exit(1);
}

console.log('✅ Access control working correctly\n');

// Test 4: Verify admin filtering
console.log('Test 4: Checking admin template filtering...');

const publicCount = publicTemplates.length;
const adminCount = adminTemplates.length;

if (adminCount < publicCount) {
  console.error('❌ Admin should see at least as many templates as public users');
  process.exit(1);
}

const enterpriseInPublic = publicTemplates.find(t => t.key === 'enterprise');
const enterpriseInAdmin = adminTemplates.find(t => t.key === 'enterprise');

if (enterpriseInPublic) {
  console.error('❌ SECURITY ISSUE: Enterprise template visible to non-admin users');
  process.exit(1);
}

if (!enterpriseInAdmin) {
  console.error('❌ Enterprise template should be visible to admin users');
  process.exit(1);
}

console.log(`✅ Template filtering working (Public: ${publicCount}, Admin: ${adminCount})\n`);

// Test 5: Verify default template
console.log('Test 5: Checking default template...');

const defaultKey = getDefaultTemplateKey();
if (defaultKey !== 'standard') {
  console.error(`❌ Default template should be 'standard', got '${defaultKey}'`);
  process.exit(1);
}

const defaultValidation = validateTemplateAccess(defaultKey, false);
if (!defaultValidation.valid) {
  console.error('❌ Default template should be accessible to all users');
  process.exit(1);
}

console.log('✅ Default template is valid and accessible\n');

// Test 6: Verify prompts are different
console.log('Test 6: Checking prompt uniqueness...');

const prompts = expectedTemplates.map(key => getSystemPromptForTemplate(key));
const uniquePrompts = new Set(prompts);

if (uniquePrompts.size !== expectedTemplates.length) {
  console.error('❌ Some templates have duplicate prompts');
  process.exit(1);
}

console.log('✅ All templates have unique prompts\n');

// Summary
console.log('═══════════════════════════════════════════════════');
console.log('🎉 All Security Validations Passed!');
console.log('═══════════════════════════════════════════════════');
console.log(`✅ ${expectedTemplates.length} templates configured`);
console.log(`✅ ${publicCount} templates available to public users`);
console.log(`✅ ${adminCount} templates available to admin users`);
console.log('✅ No system prompts exposed in metadata');
console.log('✅ Access control functioning correctly');
console.log('✅ Default template is secure and accessible');
console.log('═══════════════════════════════════════════════════\n');

process.exit(0);

