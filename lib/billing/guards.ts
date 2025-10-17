/**
 * Billing Guards - Enforce plan limits and restrictions
 */

export interface WorkspaceEntitlements {
  seatsIncluded: number;
  projectsIncluded: number;
  storiesPerMonth: number;
  aiTokensIncluded: number;
  advancedAi: boolean;
  exportsEnabled: boolean;
  templatesEnabled: boolean;
  rbacLevel: string;
  auditLevel: string;
  ssoEnabled: boolean;
  supportTier: string;
  fairUse: boolean;
}

export interface UsageCheck {
  allowed: boolean;
  warn: boolean;
  used: number;
  limit: number;
  percentage: number;
  message?: string;
  upgradeUrl?: string;
}

/**
 * Check if user can be invited (seat limit)
 */
export function canInviteUser(
  workspace: WorkspaceEntitlements,
  currentSeatCount: number
): UsageCheck {
  const limit = workspace.seatsIncluded;
  const unlimited = limit >= 999999;

  if (unlimited) {
    return {
      allowed: true,
      warn: false,
      used: currentSeatCount,
      limit: -1,
      percentage: 0,
    };
  }

  const allowed = currentSeatCount < limit;
  const percentage = (currentSeatCount / limit) * 100;

  return {
    allowed,
    warn: percentage >= 80 && allowed,
    used: currentSeatCount,
    limit,
    percentage,
    message: allowed
      ? undefined
      : `You've reached your seat limit (${limit} seats). Upgrade to add more team members.`,
    upgradeUrl: allowed ? undefined : "/settings/billing",
  };
}

/**
 * Check if project can be created
 */
export function canCreateProject(
  workspace: WorkspaceEntitlements,
  currentProjectCount: number
): UsageCheck {
  const limit = workspace.projectsIncluded;
  const unlimited = limit >= 999999;

  if (unlimited) {
    return {
      allowed: true,
      warn: false,
      used: currentProjectCount,
      limit: -1,
      percentage: 0,
    };
  }

  const allowed = currentProjectCount < limit;
  const percentage = (currentProjectCount / limit) * 100;

  return {
    allowed,
    warn: percentage >= 80 && allowed,
    used: currentProjectCount,
    limit,
    percentage,
    message: allowed
      ? undefined
      : `You've reached your project limit (${limit} projects). Upgrade to create more.`,
    upgradeUrl: allowed ? undefined : "/settings/billing",
  };
}

/**
 * Check monthly story limit
 */
export function withinStoryLimit(
  workspace: WorkspaceEntitlements,
  storiesCreatedThisMonth: number
): UsageCheck {
  const limit = workspace.storiesPerMonth;
  const unlimited = limit >= 999999;

  if (unlimited) {
    return {
      allowed: true,
      warn: false,
      used: storiesCreatedThisMonth,
      limit: -1,
      percentage: 0,
    };
  }

  const percentage = (storiesCreatedThisMonth / limit) * 100;
  const allowed = storiesCreatedThisMonth < limit;
  const warn = percentage >= 90 && percentage < 100;

  return {
    allowed,
    warn,
    used: storiesCreatedThisMonth,
    limit,
    percentage,
    message: !allowed
      ? `You've reached your monthly story limit (${limit} stories). Resets next month or upgrade now.`
      : warn
      ? `You've used ${percentage.toFixed(0)}% of your monthly story limit.`
      : undefined,
    upgradeUrl: !allowed ? "/settings/billing" : undefined,
  };
}

/**
 * Check monthly AI token limit
 */
export function withinTokenLimit(
  workspace: WorkspaceEntitlements,
  tokensUsedThisMonth: number
): UsageCheck {
  const limit = workspace.aiTokensIncluded;
  const unlimited = limit >= 999999;

  if (unlimited) {
    return {
      allowed: true,
      warn: false,
      used: tokensUsedThisMonth,
      limit: -1,
      percentage: 0,
    };
  }

  const percentage = (tokensUsedThisMonth / limit) * 100;
  const allowed = tokensUsedThisMonth < limit;
  const warn = percentage >= 90 && percentage < 100;

  return {
    allowed,
    warn,
    used: tokensUsedThisMonth,
    limit,
    percentage,
    message: !allowed
      ? `You've reached your monthly AI token limit (${limit.toLocaleString()} tokens). Resets next month or upgrade now.`
      : warn
      ? `You've used ${percentage.toFixed(0)}% of your monthly AI tokens.`
      : undefined,
    upgradeUrl: !allowed ? "/settings/billing" : undefined,
  };
}

/**
 * Check if feature is available
 */
export function canUseFeature(
  workspace: WorkspaceEntitlements,
  feature: "exports" | "templates" | "advancedAi" | "sso"
): { allowed: boolean; message?: string; upgradeUrl?: string } {
  const featureMap = {
    exports: workspace.exportsEnabled,
    templates: workspace.templatesEnabled,
    advancedAi: workspace.advancedAi,
    sso: workspace.ssoEnabled,
  };

  const allowed = featureMap[feature];

  return {
    allowed,
    message: allowed
      ? undefined
      : `This feature requires a plan upgrade.`,
    upgradeUrl: allowed ? undefined : "/settings/billing",
  };
}

/**
 * Get usage summary for dashboard
 */
export function getUsageSummary(
  workspace: WorkspaceEntitlements,
  currentUsage: {
    seats: number;
    projects: number;
    storiesThisMonth: number;
    tokensThisMonth: number;
  }
) {
  return {
    seats: canInviteUser(workspace, currentUsage.seats),
    projects: canCreateProject(workspace, currentUsage.projects),
    stories: withinStoryLimit(workspace, currentUsage.storiesThisMonth),
    tokens: withinTokenLimit(workspace, currentUsage.tokensThisMonth),
  };
}
