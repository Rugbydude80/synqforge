import Stripe from "stripe";

/**
 * Entitlements Model - Feature flags and limits based on subscription plan
 */
export type Entitlements = {
  plan: string;
  plan_cycle: "monthly" | "annual";
  seats_included: number | -1; // -1 = unlimited
  projects_included: number | -1; // -1 = unlimited
  stories_per_month: number | -1; // -1 = unlimited
  ai_tokens_included: number | -1; // -1 = unlimited/high
  advanced_ai: boolean;
  exports: boolean;
  templates: boolean;
  rbac_level: "none" | "basic" | "advanced";
  audit_level: "none" | "basic" | "advanced";
  sso_enabled: boolean;
  support_tier: "community" | "priority" | "sla";
  fair_use: boolean;
};

/**
 * Helper to convert string metadata to boolean
 */
const toBool = (v?: string): boolean => v === "true";

/**
 * Helper to convert string metadata to number
 * Handles "unlimited" and "high" as sentinel value -1
 */
const toNum = (v?: string): number => {
  if (!v) return 0;
  if (v === "unlimited" || v === "high") return -1; // sentinel for unlimited
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Extract entitlements from Stripe Price metadata
 * This is the single source of truth for what features a plan includes
 */
export function entitlementsFromPrice(price: Stripe.Price): Entitlements {
  const m = (price.metadata || {}) as Record<string, string>;

  return {
    plan: m.plan || "solo",
    plan_cycle: (m.cycle as "monthly" | "annual") || "monthly",
    seats_included: m.seats_included === "unlimited" ? -1 : toNum(m.seats_included || "1"),
    projects_included: m.projects_included === "unlimited" ? -1 : toNum(m.projects_included || "1"),
    stories_per_month: ["unlimited", "high"].includes(m.stories_per_month)
      ? -1
      : toNum(m.stories_per_month || "2000"),
    ai_tokens_included: ["unlimited", "high"].includes(m.ai_tokens_included)
      ? -1
      : toNum(m.ai_tokens_included || "50000"),
    advanced_ai: toBool(m.advanced_ai),
    exports: toBool(m.exports),
    templates: toBool(m.templates),
    rbac_level: (m.rbac as "none" | "basic" | "advanced") || "none",
    audit_level: (m.audit_logs as "none" | "basic" | "advanced") || "none",
    sso_enabled: toBool(m.sso),
    support_tier: (m.support_tier as "community" | "priority" | "sla") || "community",
    fair_use: toBool(m.fair_use ?? "true"),
  };
}

/**
 * Convert sentinel values (-1) to large numbers for database storage
 */
export function entitlementsToDbValues(ent: Entitlements) {
  const UNLIMITED = 999999;

  return {
    plan: ent.plan,
    planCycle: ent.plan_cycle,
    seatsIncluded: ent.seats_included < 0 ? UNLIMITED : ent.seats_included,
    projectsIncluded: ent.projects_included < 0 ? UNLIMITED : ent.projects_included,
    storiesPerMonth: ent.stories_per_month < 0 ? UNLIMITED : ent.stories_per_month,
    aiTokensIncluded: ent.ai_tokens_included < 0 ? UNLIMITED : ent.ai_tokens_included,
    advancedAi: ent.advanced_ai,
    exportsEnabled: ent.exports,
    templatesEnabled: ent.templates,
    rbacLevel: ent.rbac_level,
    auditLevel: ent.audit_level,
    ssoEnabled: ent.sso_enabled,
    supportTier: ent.support_tier,
    fairUse: ent.fair_use,
  };
}

/**
 * Get free tier entitlements (for canceled subscriptions)
 */
export function getFreeTierEntitlements(): Entitlements {
  return {
    plan: "free",
    plan_cycle: "monthly",
    seats_included: 1,
    projects_included: 1,
    stories_per_month: 200,
    ai_tokens_included: 5000,
    advanced_ai: false,
    exports: false,
    templates: true,
    rbac_level: "none",
    audit_level: "none",
    sso_enabled: false,
    support_tier: "community",
    fair_use: true,
  };
}
