/**
 * Comprehensive AI Story Generation & Validation Types
 * Implements full testing checklist requirements
 */

import { z } from 'zod';
import { MODEL } from './client';

// ============================================
// ACCEPTANCE THEMES (LOCKED ENUM)
// ============================================

export const ACCEPTANCE_THEMES = [
  'filtering',
  'sorting',
  'pagination',
  'search',
  'validation',
  'authentication',
  'authorization',
  'persistence',
  'performance',
  'accessibility',
  'error-handling',
  'data-display',
  'data-entry',
  'navigation',
  'notifications',
  'real-time',
  'offline',
  'responsive',
  'internationalization',
  'audit',
  'export',
  'import',
] as const;

export type AcceptanceTheme = typeof ACCEPTANCE_THEMES[number];

// ============================================
// INTERACTIVE VERB WHITELIST
// ============================================

export const INTERACTIVE_VERBS = [
  'click',
  'select',
  'choose',
  'enter',
  'type',
  'input',
  'submit',
  'press',
  'tap',
  'swipe',
  'drag',
  'drop',
  'upload',
  'download',
  'toggle',
  'open',
  'close',
  'expand',
  'collapse',
  'scroll',
  'focus',
  'blur',
  'hover',
  'navigate',
  'filter',
  'sort',
] as const;

// ============================================
// NO-RESULTS DETECTION KEYWORDS
// ============================================

export const NO_RESULTS_KEYWORDS = [
  'no results',
  'no records',
  'no items',
  'no data',
  'no matches',
  'no products',
  'no users',
  'empty',
  'zero results',
  'nothing found',
  'not found',
] as const;

// ============================================
// AUTO-FIX TRANSFORMATION TYPES
// ============================================

export const AUTOFIX_TYPES = [
  'split-then',           // Split compound Then clauses with "and/or"
  'insert-no-results',    // Add missing no-results AC
  'add-perf',             // Append performance timing to interactive ACs
  'add-wcag',             // Add WCAG note when UI components present
  'rewrite-passive',      // Rewrite passive voice to active
  'add-persistence',      // Add persistence AC when theme present
] as const;

export type AutofixType = typeof AUTOFIX_TYPES[number];

// ============================================
// ACCEPTANCE CRITERIA SCHEMA
// ============================================

export const AcceptanceCriterionSchema = z.object({
  id: z.string().optional(),
  given: z.string().min(5),
  when: z.string().min(5),
  then: z.string().min(5),
  is_interactive: z.boolean(),
  performance_target_ms: z.number().optional(),
  themes: z.array(z.enum(ACCEPTANCE_THEMES)).min(0),
}).strict();

export type AcceptanceCriterion = z.infer<typeof AcceptanceCriterionSchema>;

// ============================================
// CAPABILITY SCHEMA
// ============================================

export const CapabilitySchema = z.object({
  key: z.string().min(1),
  title: z.string().min(10).max(200),
  description: z.string().min(20),
  estimate: z.number().int().min(1).max(8),
  themes: z.array(z.enum(ACCEPTANCE_THEMES)).min(1),
  acceptanceCriteria: z.array(AcceptanceCriterionSchema).min(4).max(7),
  technicalHints: z.array(z.string()).optional(),
  hasUI: z.boolean(),
  requiresWCAG: z.boolean(),
  requiresPersistence: z.boolean(),
}).strict();

export type Capability = z.infer<typeof CapabilitySchema>;

// ============================================
// DECOMPOSITION REQUEST & RESPONSE
// ============================================

export const DecompositionRequestSchema = z.object({
  requestId: z.string().uuid().optional(),
  requirements: z.string().min(20),
  projectId: z.string().uuid(),
  projectContext: z.string().optional(),
  targetUsers: z.string().optional(),
  businessGoals: z.string().optional(),
  similarityThreshold: z.number().min(0).max(1).default(0.85),
  model: z.string().default(MODEL),
}).strict();

export type DecompositionRequest = z.infer<typeof DecompositionRequestSchema>;

export const MergeSuggestionSchema = z.object({
  capability1Key: z.string(),
  capability2Key: z.string(),
  similarity: z.number().min(0).max(1),
  provider: z.string(),
  model: z.string(),
  reason: z.string(),
}).strict();

export type MergeSuggestion = z.infer<typeof MergeSuggestionSchema>;

export const DecompositionResponseSchema = z.object({
  requestId: z.string().uuid(),
  capabilities: z.array(CapabilitySchema).min(1).max(6),
  total_estimate: z.number().int().min(1),
  split_recommended: z.boolean(),
  soft_cap_exceeded: z.boolean(),
  hard_cap_enforced: z.boolean(),
  merge_suggestions: z.array(MergeSuggestionSchema),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
  }),
  model: z.string(),
}).strict();

export type DecompositionResponse = z.infer<typeof DecompositionResponseSchema>;

// ============================================
// STORY VALIDATION SCHEMA
// ============================================

export const ValidationIssueSchema = z.object({
  severity: z.enum(['error', 'warning', 'info']),
  code: z.string(),
  message: z.string(),
  acIndex: z.number().optional(),
  autoFixApplied: z.boolean().default(false),
}).strict();

export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

export const AutofixDetailSchema = z.object({
  type: z.enum(AUTOFIX_TYPES),
  description: z.string(),
  acIndex: z.number().optional(),
  before: z.string().optional(),
  after: z.string().optional(),
}).strict();

export type AutofixDetail = z.infer<typeof AutofixDetailSchema>;

export const StoryValidationResultSchema = z.object({
  status: z.enum(['ok', 'warning', 'error']),
  issues: z.array(ValidationIssueSchema),
  autofixDetails: z.array(AutofixDetailSchema),
  quality_score: z.number().min(0).max(10),
  manual_review_required: z.boolean(),
  ready_for_sprint: z.boolean(),
  acceptanceCriteria: z.array(AcceptanceCriterionSchema),
}).strict();

export type StoryValidationResult = z.infer<typeof StoryValidationResultSchema>;

// ============================================
// STORY GENERATION SCHEMA
// ============================================

export const GenerateStoryRequestSchema = z.object({
  requestId: z.string().uuid().optional(),
  capability: CapabilitySchema,
  projectId: z.string().uuid(),
  epicId: z.string().uuid().optional(),
  projectContext: z.string().optional(),
  qualityThreshold: z.number().min(0).max(10).default(7.0),
  model: z.string().default(MODEL),
}).strict();

export type GenerateStoryRequest = z.infer<typeof GenerateStoryRequestSchema>;

export const GenerateStoryResponseSchema = z.object({
  requestId: z.string().uuid(),
  capabilityKey: z.string(),
  story: z.object({
    title: z.string(),
    description: z.string(),
    acceptanceCriteria: z.array(AcceptanceCriterionSchema).min(4).max(7),
    technicalHints: z.array(z.string()),
    estimate: z.number().int().min(1).max(8),
  }),
  validation: StoryValidationResultSchema,
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
  }),
  model: z.string(),
}).strict();

export type GenerateStoryResponse = z.infer<typeof GenerateStoryResponseSchema>;

// ============================================
// EPIC BUILD REQUEST & RESPONSE
// ============================================

export const EpicBuildRequestSchema = z.object({
  requestId: z.string().uuid().optional(),
  epicTitle: z.string().min(10).max(200),
  epicDescription: z.string().min(20),
  capabilities: z.array(CapabilitySchema).min(1).max(6),
  projectId: z.string().uuid(),
  projectContext: z.string().optional(),
  parentEpicId: z.string().uuid().optional(),
  siblingEpicIds: z.array(z.string().uuid()).optional(),
  qualityThreshold: z.number().min(0).max(10).default(7.0),
  model: z.string().default(MODEL),
}).strict();

export type EpicBuildRequest = z.infer<typeof EpicBuildRequestSchema>;

export const EpicBuildResponseSchema = z.object({
  requestId: z.string().uuid(),
  epic: z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string(),
    parentEpicId: z.string().uuid().optional(),
    siblingEpicIds: z.array(z.string().uuid()).optional(),
  }),
  stories: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string(),
    acceptanceCriteria: z.array(AcceptanceCriterionSchema),
    technicalHints: z.array(z.string()),
    estimate: z.number(),
    capabilityKey: z.string(),
    validation: StoryValidationResultSchema,
  })),
  usageMetrics: z.object({
    totalTokens: z.number(),
    totalCost: z.number(),
    avgQualityScore: z.number(),
    storiesCreated: z.number(),
    autofixesApplied: z.number(),
    manualReviewCount: z.number(),
  }),
  mergeSuggestions: z.array(MergeSuggestionSchema),
}).strict();

export type EpicBuildResponse = z.infer<typeof EpicBuildResponseSchema>;

// ============================================
// IDEMPOTENCY & CORRELATION
// ============================================

export interface CorrelationKey {
  projectId: string;
  requestId: string;
  capabilityKey?: string;
}

// ============================================
// OBSERVABILITY METRICS
// ============================================

export interface DecompositionMetrics {
  split_recommended_rate: number;
  soft_cap_exceeded_rate: number;
  total_estimate_histogram: number[];
  merge_avg_similarity: number;
  provider: string;
  model: string;
}

export interface ValidationMetrics {
  autofix_applied_counts: Record<AutofixType, number>;
  validation_fail_reasons: Record<string, number>;
  interactive_flag_mismatch_rate: number;
}

export interface IdempotencyMetrics {
  stories_dup_prevented: number;
  epics_dup_prevented: number;
}

// ============================================
// PII REDACTION PATTERNS
// ============================================

export const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  token: /[?&]token=[^&\s]+/g,
  apiKey: /[?&]api[_-]?key=[^&\s]+/gi,
} as const;

