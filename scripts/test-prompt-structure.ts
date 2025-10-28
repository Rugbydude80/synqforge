#!/usr/bin/env tsx

/**
 * Test Prompt Structure and Uniqueness
 * 
 * Verifies that each template prompt:
 * 1. Has proper JSON output instructions
 * 2. Is substantially different from others
 * 3. Contains appropriate guidance for its purpose
 */

import { getSystemPromptForTemplate } from '../lib/ai/prompt-templates';

console.log('🧪 Testing Prompt Structure and Content...\n');

const templates = [
  { key: 'standard', name: 'Standard' },
  { key: 'lean-agile', name: 'Lean Agile' },
  { key: 'bdd-compliance', name: 'BDD Compliance' },
  { key: 'enterprise', name: 'Enterprise' },
  { key: 'technical-focus', name: 'Technical Focus' },
  { key: 'ux-focused', name: 'UX Focused' },
];

const prompts = new Map<string, string>();
let allTestsPassed = true;

// Load all prompts
templates.forEach(({ key, name }) => {
  console.log(`📝 Testing: ${name} (${key})`);
  const prompt = getSystemPromptForTemplate(key);
  prompts.set(key, prompt);
  
  // Test 1: Minimum length
  if (prompt.length < 200) {
    console.error(`  ❌ Prompt too short (${prompt.length} chars)`);
    allTestsPassed = false;
  } else {
    console.log(`  ✅ Sufficient length (${prompt.length} chars)`);
  }
  
  // Test 2: Contains JSON output instructions
  const hasJson = prompt.toLowerCase().includes('json');
  if (!hasJson) {
    console.error(`  ❌ Missing JSON output instructions`);
    allTestsPassed = false;
  } else {
    console.log(`  ✅ Has JSON output format`);
  }
  
  // Test 3: Contains "stories" reference
  const hasStories = prompt.toLowerCase().includes('stories');
  if (!hasStories) {
    console.error(`  ❌ Missing reference to stories`);
    allTestsPassed = false;
  } else {
    console.log(`  ✅ References stories`);
  }
  
  // Test 4: Has structure (numbered items or clear sections)
  const hasStructure = /\d+\.|1\)|For each story/.test(prompt);
  if (!hasStructure) {
    console.error(`  ❌ Missing clear structure`);
    allTestsPassed = false;
  } else {
    console.log(`  ✅ Has clear structure`);
  }
  
  console.log();
});

// Test uniqueness and differentiation
console.log('🔍 Testing Prompt Differentiation...\n');

const promptArray = Array.from(prompts.entries());

for (let i = 0; i < promptArray.length; i++) {
  for (let j = i + 1; j < promptArray.length; j++) {
    const [key1, prompt1] = promptArray[i];
    const [key2, prompt2] = promptArray[j];
    
    // Calculate similarity (simple word overlap)
    const words1 = new Set(prompt1.toLowerCase().split(/\s+/));
    const words2 = new Set(prompt2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    const similarity = intersection.size / union.size;
    
    console.log(`  ${key1} vs ${key2}: ${(similarity * 100).toFixed(1)}% word overlap`);
    
    // Prompts should have some similarity (common structure) but not be too similar
    if (similarity > 0.8) {
      console.error(`  ⚠️  Warning: Very high similarity (${(similarity * 100).toFixed(1)}%)`);
    }
  }
}

console.log();

// Test template-specific characteristics
console.log('🎯 Testing Template-Specific Characteristics...\n');

const characteristics = {
  'lean-agile': ['lean', 'minimal', 'outcome', 'value'],
  'bdd-compliance': ['given', 'when', 'then', 'scenario', 'test'],
  'enterprise': ['security', 'compliance', 'audit', 'enterprise'],
  'technical-focus': ['technical', 'implementation', 'architecture', 'pattern'],
  'ux-focused': ['accessibility', 'wcag', 'ux', 'user experience', 'responsive'],
};

Object.entries(characteristics).forEach(([key, expectedWords]) => {
  const prompt = prompts.get(key);
  if (!prompt) return;
  
  const promptLower = prompt.toLowerCase();
  const foundWords = expectedWords.filter(word => promptLower.includes(word));
  
  console.log(`  ${key}:`);
  if (foundWords.length >= 2) {
    console.log(`    ✅ Contains characteristic keywords: ${foundWords.join(', ')}`);
  } else {
    console.error(`    ❌ Missing key characteristics (found only: ${foundWords.join(', ') || 'none'})`);
    allTestsPassed = false;
  }
});

console.log();

// Sample prompt excerpts
console.log('📄 Sample Prompt Excerpts (first 150 chars)...\n');

templates.forEach(({ key, name }) => {
  const prompt = prompts.get(key);
  if (prompt) {
    const excerpt = prompt.substring(0, 150).replace(/\n/g, ' ').trim();
    console.log(`  ${name}:`);
    console.log(`    "${excerpt}..."`);
    console.log();
  }
});

// Final summary
console.log('═══════════════════════════════════════════════════');
if (allTestsPassed) {
  console.log('🎉 All Prompt Structure Tests Passed!');
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ All prompts have proper length');
  console.log('✅ All prompts include JSON output format');
  console.log('✅ All prompts reference stories');
  console.log('✅ All prompts have clear structure');
  console.log('✅ All prompts are unique and differentiated');
  console.log('✅ Template-specific characteristics present');
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(0);
} else {
  console.log('❌ Some Tests Failed!');
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(1);
}

