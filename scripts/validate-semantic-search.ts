/**
 * Comprehensive Validation Script for Semantic Search Feature
 * Runs all validation checks and generates a report
 */

import { neon } from '@neondatabase/serverless';
import { EmbeddingsService } from '../lib/services/embeddings.service';
import { ContextAccessService } from '../lib/services/context-access.service';
import { UserTier, ContextLevel } from '../lib/types/context.types';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: any;
}

interface PhaseResult {
  phase: string;
  tests: ValidationResult[];
  passed: number;
  failed: number;
  warnings: number;
}

const results: PhaseResult[] = [];

function addResult(phase: string, result: ValidationResult) {
  let phaseResult = results.find(r => r.phase === phase);
  if (!phaseResult) {
    phaseResult = { phase, tests: [], passed: 0, failed: 0, warnings: 0 };
    results.push(phaseResult);
  }
  phaseResult.tests.push(result);
  if (result.passed) {
    phaseResult.passed++;
  } else {
    phaseResult.failed++;
  }
}

async function validateDatabaseInfrastructure() {
  console.log('\n📊 Phase 1: Database Infrastructure Validation\n');
  
  const sql = neon(process.env.DATABASE_URL!);
  
  // Test 1.1: Verify pgvector extension
  try {
    const extensions = await sql`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'vector'
    `;
    
    if (extensions.length > 0) {
      addResult('Database', {
        passed: true,
        message: `✅ pgvector extension installed (version ${extensions[0].extversion})`,
        details: extensions[0],
      });
      console.log(`✅ pgvector extension: v${extensions[0].extversion}`);
    } else {
      addResult('Database', {
        passed: false,
        message: '❌ pgvector extension not found',
      });
      console.log('❌ pgvector extension NOT FOUND');
    }
  } catch (error) {
    addResult('Database', {
      passed: false,
      message: `❌ Failed to check pgvector: ${error}`,
    });
  }
  
  // Test 1.2: Verify embedding column
  try {
    const columns = await sql`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'stories' 
        AND column_name = 'embedding'
    `;
    
    if (columns.length > 0 && columns[0].udt_name === 'vector') {
      addResult('Database', {
        passed: true,
        message: '✅ Embedding column exists with correct type (vector)',
      });
      console.log('✅ Embedding column: vector type');
    } else {
      addResult('Database', {
        passed: false,
        message: '❌ Embedding column missing or wrong type',
      });
      console.log('❌ Embedding column NOT FOUND or wrong type');
    }
  } catch (error) {
    addResult('Database', {
      passed: false,
      message: `❌ Failed to check embedding column: ${error}`,
    });
  }
  
  // Test 1.3: Verify HNSW index
  try {
    const indexes = await sql`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'stories' 
        AND indexname = 'stories_embedding_idx'
    `;
    
    if (indexes.length > 0 && indexes[0].indexdef.includes('hnsw')) {
      addResult('Database', {
        passed: true,
        message: '✅ HNSW index exists on embeddings',
      });
      console.log('✅ HNSW index: stories_embedding_idx');
    } else {
      addResult('Database', {
        passed: false,
        message: '❌ HNSW index not found',
      });
      console.log('❌ HNSW index NOT FOUND');
    }
  } catch (error) {
    addResult('Database', {
      passed: false,
      message: `❌ Failed to check index: ${error}`,
    });
  }
  
  // Test 1.4: Check embedding coverage
  try {
    const stats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(embedding) as with_embedding,
        ROUND(100.0 * COUNT(embedding) / NULLIF(COUNT(*), 0), 2) as coverage
      FROM stories
    `;
    
    const coverage = parseFloat(stats[0].coverage || '0');
    const total = parseInt(stats[0].total);
    const withEmbedding = parseInt(stats[0].with_embedding);
    
    console.log(`📊 Coverage: ${withEmbedding}/${total} stories (${coverage}%)`);
    
    if (coverage >= 95) {
      addResult('Database', {
        passed: true,
        message: `✅ Excellent embedding coverage: ${coverage}%`,
        details: stats[0],
      });
    } else if (coverage >= 75) {
      addResult('Database', {
        passed: true,
        message: `⚠️  Good coverage but room for improvement: ${coverage}%`,
        details: stats[0],
      });
    } else {
      addResult('Database', {
        passed: false,
        message: `❌ Low embedding coverage: ${coverage}%`,
        details: stats[0],
      });
    }
  } catch (error) {
    addResult('Database', {
      passed: false,
      message: `❌ Failed to check coverage: ${error}`,
    });
  }
}

async function validateServices() {
  console.log('\n📊 Phase 2: Service Implementation Validation\n');
  
  const embeddingsService = new EmbeddingsService();
  
  // Test 2.1: Health check
  try {
    const health = await embeddingsService.healthCheck();
    
    const allHealthy = health.database && health.qwenApi && health.indexExists;
    
    console.log('🏥 Health Check:');
    console.log(`   Database: ${health.database ? '✅' : '❌'}`);
    console.log(`   Qwen API: ${health.qwenApi ? '✅' : '❌'}`);
    console.log(`   Index: ${health.indexExists ? '✅' : '❌'}`);
    
    if (allHealthy) {
      addResult('Services', {
        passed: true,
        message: '✅ All health checks passed',
        details: health,
      });
    } else {
      addResult('Services', {
        passed: false,
        message: '❌ Some health checks failed',
        details: health,
      });
    }
  } catch (error) {
    addResult('Services', {
      passed: false,
      message: `❌ Health check failed: ${error}`,
    });
  }
  
  // Test 2.2: Feature enabled check
  const isEnabled = embeddingsService.isEnabled();
  console.log(`🎛️  Semantic search enabled: ${isEnabled ? 'YES' : 'NO'}`);
  
  addResult('Services', {
    passed: true,
    message: `${isEnabled ? '✅' : '⚠️ '} Semantic search ${isEnabled ? 'enabled' : 'disabled'}`,
  });
  
  // Test 2.3: Embedding generation
  if (isEnabled) {
    try {
      const testText = "As a user, I want to upload documents with security scanning";
      const startTime = Date.now();
      const embedding = await embeddingsService.generateEmbedding(testText);
      const duration = Date.now() - startTime;
      
      console.log(`⚡ Embedding generation: ${duration}ms`);
      
      if (embedding.length === 1024) {
        addResult('Services', {
          passed: true,
          message: `✅ Embedding generation works (${duration}ms, 1024 dims)`,
        });
      } else {
        addResult('Services', {
          passed: false,
          message: `❌ Wrong embedding dimensions: ${embedding.length} (expected 1024)`,
        });
      }
      
      if (duration < 500) {
        console.log('   ✅ Excellent performance (<500ms)');
      } else if (duration < 1000) {
        console.log('   ✅ Good performance (<1s)');
      } else {
        console.log('   ⚠️  Slow performance - check API latency');
      }
    } catch (error) {
      addResult('Services', {
        passed: false,
        message: `❌ Embedding generation failed: ${error}`,
      });
    }
  }
}

function validateAccessControl() {
  console.log('\n📊 Phase 3: Access Control Validation\n');
  
  // Test tier restrictions
  const tiers = [
    {
      tier: UserTier.STARTER,
      allowed: [ContextLevel.MINIMAL],
      denied: [ContextLevel.STANDARD, ContextLevel.COMPREHENSIVE],
    },
    {
      tier: UserTier.CORE,
      allowed: [ContextLevel.MINIMAL, ContextLevel.STANDARD],
      denied: [ContextLevel.COMPREHENSIVE, ContextLevel.COMPREHENSIVE_THINKING],
    },
    {
      tier: UserTier.PRO,
      allowed: [ContextLevel.MINIMAL, ContextLevel.STANDARD, ContextLevel.COMPREHENSIVE],
      denied: [ContextLevel.COMPREHENSIVE_THINKING],
    },
    {
      tier: UserTier.TEAM,
      allowed: [ContextLevel.MINIMAL, ContextLevel.STANDARD, ContextLevel.COMPREHENSIVE, ContextLevel.COMPREHENSIVE_THINKING],
      denied: [],
    },
  ];
  
  let accessTestsPassed = 0;
  let accessTestsFailed = 0;
  
  tiers.forEach(({ tier, allowed, denied }) => {
    console.log(`\n🔐 Testing ${tier}:`);
    
    allowed.forEach(level => {
      const canAccess = ContextAccessService.canAccessContextLevel(tier, level);
      if (canAccess) {
        console.log(`   ✅ ${level}: Allowed`);
        accessTestsPassed++;
      } else {
        console.log(`   ❌ ${level}: Should be allowed but isn't`);
        accessTestsFailed++;
      }
    });
    
    denied.forEach(level => {
      const canAccess = ContextAccessService.canAccessContextLevel(tier, level);
      if (!canAccess) {
        console.log(`   ✅ ${level}: Correctly denied`);
        accessTestsPassed++;
      } else {
        console.log(`   ❌ ${level}: Should be denied but isn't`);
        accessTestsFailed++;
      }
    });
  });
  
  if (accessTestsFailed === 0) {
    addResult('Access Control', {
      passed: true,
      message: `✅ All ${accessTestsPassed} access control tests passed`,
    });
  } else {
    addResult('Access Control', {
      passed: false,
      message: `❌ ${accessTestsFailed}/${accessTestsPassed + accessTestsFailed} access tests failed`,
    });
  }
  
  // Test action requirements
  console.log('\n💰 Action Requirements:');
  const actionCosts = [
    { level: ContextLevel.MINIMAL, expected: 1 },
    { level: ContextLevel.STANDARD, expected: 2 },
    { level: ContextLevel.COMPREHENSIVE, expected: 2 },
    { level: ContextLevel.COMPREHENSIVE_THINKING, expected: 3 },
  ];
  
  let actionTestsPassed = true;
  actionCosts.forEach(({ level, expected }) => {
    const actual = ContextAccessService.getActionsRequired(level);
    const match = actual === expected;
    console.log(`   ${match ? '✅' : '❌'} ${level}: ${actual} actions ${match ? '' : `(expected ${expected})`}`);
    if (!match) actionTestsPassed = false;
  });
  
  addResult('Access Control', {
    passed: actionTestsPassed,
    message: actionTestsPassed ? '✅ Action costs correct' : '❌ Action costs mismatch',
  });
}

function printFinalReport() {
  console.log('\n\n' + '='.repeat(80));
  console.log('📋 VALIDATION REPORT SUMMARY');
  console.log('='.repeat(80) + '\n');
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  results.forEach(phase => {
    const status = phase.failed === 0 ? '✅' : '❌';
    console.log(`${status} ${phase.phase}: ${phase.passed} passed, ${phase.failed} failed`);
    totalPassed += phase.passed;
    totalFailed += phase.failed;
    
    if (phase.failed > 0) {
      phase.tests.filter(t => !t.passed).forEach(test => {
        console.log(`   ❌ ${test.message}`);
      });
    }
  });
  
  console.log('\n' + '-'.repeat(80));
  console.log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed`);
  
  const successRate = (totalPassed / (totalPassed + totalFailed) * 100).toFixed(1);
  console.log(`Success Rate: ${successRate}%`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 ALL VALIDATION TESTS PASSED! Feature is production-ready.');
  } else if (totalFailed <= 2) {
    console.log('\n⚠️  Some tests failed but feature may still be usable. Review failures.');
  } else {
    console.log('\n❌ Multiple tests failed. Feature needs attention before deployment.');
  }
  
  console.log('='.repeat(80) + '\n');
}

async function runValidation() {
  console.log('🚀 Starting Semantic Search Feature Validation');
  console.log('='.repeat(80));
  
  try {
    await validateDatabaseInfrastructure();
    await validateServices();
    validateAccessControl();
    
    printFinalReport();
    
    process.exit(results.some(r => r.failed > 0) ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Validation failed with error:', error);
    process.exit(1);
  }
}

// Run validation
runValidation();

