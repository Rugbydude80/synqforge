#!/usr/bin/env tsx

/**
 * Demonstrate Template Differences
 * 
 * Shows how each template approaches story generation differently
 */

import { getSystemPromptForTemplate } from '../lib/ai/prompt-templates';

console.log('📊 Template Comparison Demo\n');
console.log('This shows how each template guides AI story generation differently.\n');
console.log('═══════════════════════════════════════════════════════════════════════\n');

const templates = [
  { key: 'standard', name: 'Standard', description: 'Balanced approach' },
  { key: 'lean-agile', name: 'Lean Agile', description: 'Minimal, outcome-focused' },
  { key: 'bdd-compliance', name: 'BDD Compliance', description: 'Rigorous testing scenarios' },
  { key: 'enterprise', name: 'Enterprise', description: 'Security & compliance' },
  { key: 'technical-focus', name: 'Technical Focus', description: 'Implementation guidance' },
  { key: 'ux-focused', name: 'UX Focused', description: 'User experience emphasis' },
];

templates.forEach(({ key, name, description }) => {
  const prompt = getSystemPromptForTemplate(key);
  
  console.log(`\n🎯 ${name.toUpperCase()} (${description})`);
  console.log('─'.repeat(70));
  
  // Extract key characteristics from the prompt
  const lines = prompt.split('\n').filter(line => line.trim());
  
  // Show opening statement
  console.log(`\n📝 Opening Statement:`);
  console.log(`   ${lines[0]}`);
  
  // Show what makes it unique
  console.log(`\n🔑 Key Characteristics:`);
  
  switch (key) {
    case 'standard':
      console.log(`   • Balanced approach for most projects`);
      console.log(`   • 3-5 acceptance criteria`);
      console.log(`   • Story points estimate (1-13)`);
      console.log(`   • Clear reasoning for each story`);
      break;
      
    case 'lean-agile':
      console.log(`   • Minimal, outcome-focused stories`);
      console.log(`   • 2-4 essential criteria only`);
      console.log(`   • Conservative story points (bias toward smaller)`);
      console.log(`   • Emphasizes business value over implementation`);
      break;
      
    case 'bdd-compliance':
      console.log(`   • Strict Given/When/Then format`);
      console.log(`   • 4-8 comprehensive scenarios`);
      console.log(`   • Includes edge cases and error scenarios`);
      console.log(`   • Testing considerations and dependencies`);
      break;
      
    case 'enterprise':
      console.log(`   • Security and authorization requirements`);
      console.log(`   • Audit trail and compliance needs`);
      console.log(`   • Integration with other systems`);
      console.log(`   • 5-10 criteria covering functional + non-functional`);
      break;
      
    case 'technical-focus':
      console.log(`   • Implementation approaches and patterns`);
      console.log(`   • Technical dependencies and prerequisites`);
      console.log(`   • Performance criteria and benchmarks`);
      console.log(`   • Code quality expectations`);
      break;
      
    case 'ux-focused':
      console.log(`   • WCAG 2.1 AA accessibility requirements`);
      console.log(`   • Responsive design for multiple devices`);
      console.log(`   • Error states and user feedback`);
      console.log(`   • Loading states and microcopy guidance`);
      break;
  }
  
  // Show example output structure
  console.log(`\n📤 Expected Output Focus:`);
  if (prompt.includes('reasoning')) {
    const reasoningMatch = prompt.match(/"reasoning":\s*"([^"]+)"/);
    if (reasoningMatch) {
      console.log(`   Example: "${reasoningMatch[1]}"`);
    }
  }
  
  // Show prompt size
  console.log(`\n📏 Prompt Size: ${prompt.length} characters`);
  
  console.log('\n' + '═'.repeat(70));
});

// Example usage scenario
console.log('\n\n💡 EXAMPLE USAGE SCENARIO\n');
console.log('Given the requirement: "Add password reset functionality"\n');

console.log('🔹 Standard Template would generate:');
console.log('   • Balanced story with 3-5 clear acceptance criteria');
console.log('   • Priority and story points estimate');
console.log('   • General reasoning for the feature\n');

console.log('🔹 Lean Agile Template would generate:');
console.log('   • Minimal story focused on user outcome');
console.log('   • 2-4 essential criteria only');
console.log('   • Emphasis on delivering incremental value\n');

console.log('🔹 BDD Compliance Template would generate:');
console.log('   • Given: User has forgotten password');
console.log('   • When: User clicks "Forgot Password"');
console.log('   • Then: User receives reset email within 2 minutes');
console.log('   • Plus edge cases (expired tokens, invalid emails, etc.)\n');

console.log('🔹 Enterprise Template would generate:');
console.log('   • Security: Rate limiting on reset requests');
console.log('   • Audit: All reset attempts logged with timestamp');
console.log('   • Compliance: GDPR-compliant email handling');
console.log('   • Integration: Notification service triggered\n');

console.log('🔹 Technical Focus Template would generate:');
console.log('   • Implementation: Use JWT tokens with 1-hour expiry');
console.log('   • Performance: Reset email sent within 500ms');
console.log('   • Technical hints: Email queue, token storage strategy\n');

console.log('🔹 UX Focused Template would generate:');
console.log('   • Accessibility: Form inputs properly labeled for screen readers');
console.log('   • Responsive: Works on mobile with touch-friendly targets');
console.log('   • Error state: Clear messaging if email not found');
console.log('   • Loading: User sees spinner during submission\n');

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('✅ All templates provide unique, valuable perspectives on story generation');
console.log('═══════════════════════════════════════════════════════════════════════\n');

