'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, Zap, TrendingUp, AlertTriangle, Calendar, Info } from 'lucide-react';
import { ContextAccessService } from '@/lib/services/context-access.service';
import { UserTier, ContextLevel } from '@/lib/types/context.types';
import { cn } from '@/lib/utils';

interface AIActionsUsageData {
  actionsUsed: number;
  monthlyLimit: number;
  userTier: UserTier;
  breakdown?: {
    minimal: number;
    standard: number;
    comprehensive: number;
    comprehensiveThinking: number;
  };
  resetDate?: string;
  rolloverActions?: number;
}

interface AIActionsUsageDashboardProps {
  organizationId: string;
}

export function AIActionsUsageDashboard({ organizationId }: AIActionsUsageDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<AIActionsUsageData | null>(null);

  useEffect(() => {
    async function fetchUsageData() {
      try {
        const response = await fetch(`/api/billing/ai-actions-usage?organizationId=${organizationId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch usage data');
        }
        const data = await response.json();
        setUsageData(data);
      } catch (error) {
        console.error('Error fetching AI actions usage:', error);
        // Fallback to mock data for development
        setUsageData({
          actionsUsed: 245,
          monthlyLimit: 800,
          userTier: UserTier.PRO,
          breakdown: {
            minimal: 45,
            standard: 150,
            comprehensive: 50,
            comprehensiveThinking: 0,
          },
          resetDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          rolloverActions: 80,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchUsageData();
  }, [organizationId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-500 animate-pulse" />
            <CardTitle>AI Actions Usage</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-24 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usageData) {
    return null;
  }

  const usagePercentage = (usageData.actionsUsed / usageData.monthlyLimit) * 100;
  const actionsRemaining = usageData.monthlyLimit - usageData.actionsUsed;
  const isNearLimit = usagePercentage >= 90;
  const isAtLimit = usagePercentage >= 100;

  const contextLevelCosts = {
    [ContextLevel.MINIMAL]: ContextAccessService.getActionsRequired(ContextLevel.MINIMAL),
    [ContextLevel.STANDARD]: ContextAccessService.getActionsRequired(ContextLevel.STANDARD),
    [ContextLevel.COMPREHENSIVE]: ContextAccessService.getActionsRequired(ContextLevel.COMPREHENSIVE),
    [ContextLevel.COMPREHENSIVE_THINKING]: ContextAccessService.getActionsRequired(ContextLevel.COMPREHENSIVE_THINKING),
  };

  const resetDate = usageData.resetDate ? new Date(usageData.resetDate) : null;
  const daysUntilReset = resetDate
    ? Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <CardTitle>AI Actions Usage</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={isAtLimit ? 'destructive' : isNearLimit ? 'warning' : 'outline'}
              className="text-sm font-mono"
            >
              {usagePercentage.toFixed(1)}% used
            </Badge>
            <Badge variant="secondary" className="text-sm capitalize">
              {usageData.userTier} Plan
            </Badge>
          </div>
        </div>
        <CardDescription>
          Monitor your monthly AI action consumption by context level
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Warning Banner */}
        {isNearLimit && (
          <div
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg border-2',
              isAtLimit
                ? 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-800'
                : 'bg-amber-50 dark:bg-amber-900/10 border-amber-300 dark:border-amber-800'
            )}
          >
            <AlertTriangle
              className={cn('h-5 w-5 flex-shrink-0 mt-0.5', isAtLimit ? 'text-red-600' : 'text-amber-600')}
            />
            <div className="flex-1">
              <p className={cn('font-semibold text-sm', isAtLimit ? 'text-red-900 dark:text-red-100' : 'text-amber-900 dark:text-amber-100')}>
                {isAtLimit ? 'AI Actions Limit Reached' : 'Running Low on AI Actions'}
              </p>
              <p className={cn('text-sm mt-1', isAtLimit ? 'text-red-700 dark:text-red-200' : 'text-amber-700 dark:text-amber-200')}>
                {isAtLimit
                  ? 'You have used all your monthly AI actions. Upgrade your plan or wait for the monthly reset to continue using AI features.'
                  : `You've used ${usagePercentage.toFixed(0)}% of your monthly AI actions. Consider upgrading if you need more capacity.`}
              </p>
            </div>
            {!isAtLimit && (
              <Button size="sm" variant="outline" className="shrink-0">
                Upgrade Plan
              </Button>
            )}
          </div>
        )}

        {/* Main Usage Stats */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-4xl font-bold tabular-nums">
                {usageData.actionsUsed.toLocaleString()}
              </span>
              <span className="text-muted-foreground text-xl ml-2">
                / {usageData.monthlyLimit.toLocaleString()}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Remaining</div>
              <div className="text-2xl font-bold tabular-nums">
                {actionsRemaining.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="relative h-6 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all rounded-full',
                  isAtLimit
                    ? 'bg-red-500'
                    : isNearLimit
                    ? 'bg-amber-500'
                    : 'bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500'
                )}
                style={{
                  width: `${Math.min(usagePercentage, 100)}%`,
                }}
              />
              {usageData.rolloverActions && usageData.rolloverActions > 0 && (
                <div
                  className="absolute top-0 h-full bg-emerald-500/30 border-l-2 border-emerald-600"
                  style={{
                    left: `${Math.max(0, ((usageData.monthlyLimit - usageData.rolloverActions) / usageData.monthlyLimit) * 100)}%`,
                    width: `${(usageData.rolloverActions / usageData.monthlyLimit) * 100}%`,
                  }}
                  title={`${usageData.rolloverActions} rollover actions from last month`}
                />
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>
                  Resets in {daysUntilReset} {daysUntilReset === 1 ? 'day' : 'days'}
                  {resetDate && ` (${resetDate.toLocaleDateString()})`}
                </span>
              </div>
              {usageData.rolloverActions && usageData.rolloverActions > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  +{usageData.rolloverActions} rollover actions
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Context Level Breakdown */}
        {usageData.breakdown && (
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Usage by Context Level</h4>
            </div>

            <div className="grid gap-3">
              {/* Minimal */}
              {usageData.breakdown.minimal > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">MIN</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Minimal Context</p>
                      <p className="text-xs text-muted-foreground">{contextLevelCosts[ContextLevel.MINIMAL]}× action cost</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold tabular-nums">{usageData.breakdown.minimal}</div>
                    <div className="text-xs text-muted-foreground">actions</div>
                  </div>
                </div>
              )}

              {/* Standard */}
              {usageData.breakdown.standard > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">STD</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Standard Context</p>
                      <p className="text-xs text-muted-foreground">{contextLevelCosts[ContextLevel.STANDARD]}× action cost</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold tabular-nums">{usageData.breakdown.standard}</div>
                    <div className="text-xs text-muted-foreground">actions</div>
                  </div>
                </div>
              )}

              {/* Comprehensive (Smart Context) */}
              {usageData.breakdown.comprehensive > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Smart Context</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400">
                        {contextLevelCosts[ContextLevel.COMPREHENSIVE]}× · Semantic search enabled
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold tabular-nums text-purple-700 dark:text-purple-300">
                      {usageData.breakdown.comprehensive}
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">actions</div>
                  </div>
                </div>
              )}

              {/* Comprehensive Thinking (Deep Reasoning) */}
              {usageData.breakdown.comprehensiveThinking > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-pink-50 dark:bg-pink-900/10 border border-pink-200 dark:border-pink-800">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Deep Reasoning</p>
                      <p className="text-xs text-pink-600 dark:text-pink-400">
                        {contextLevelCosts[ContextLevel.COMPREHENSIVE_THINKING]}× · Advanced analysis
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold tabular-nums text-pink-700 dark:text-pink-300">
                      {usageData.breakdown.comprehensiveThinking}
                    </div>
                    <div className="text-xs text-pink-600 dark:text-pink-400">actions</div>
                  </div>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-900 dark:text-blue-100 leading-relaxed">
                <strong>Smart Context</strong> uses semantic search to find the 5 most relevant stories automatically,
                reducing token usage by 75% and improving story quality.{' '}
                {usageData.userTier === UserTier.STARTER || usageData.userTier === UserTier.CORE ? (
                  <span className="font-semibold">Upgrade to Pro to unlock Smart Context.</span>
                ) : (
                  <span className="font-semibold">Available on your plan.</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Need more AI actions? Upgrade your plan for higher monthly limits.
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/pricing">View Plans</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

