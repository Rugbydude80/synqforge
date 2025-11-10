'use client';

/**
 * AI Actions Usage Dashboard
 * Shows user's AI action usage, breakdown by context level, and billing info
 */

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp, Calendar, Zap, Sparkles, Brain } from 'lucide-react';
import { ContextLevel } from '@/lib/types/context.types';

interface UsageData {
  actionsUsed: number;
  actionsRemaining: number;
  monthlyLimit: number;
  breakdown: Record<string, number>;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  nearLimit: boolean;
  percentageUsed: number;
}

export function AIActionsUsageDashboard() {
  const [usageData, setUsageData] = React.useState<UsageData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchUsage() {
      try {
        const response = await fetch('/api/ai/context-level/user-data');
        if (!response.ok) {
          throw new Error('Failed to fetch usage data');
        }
        const data = await response.json();
        setUsageData({
          actionsUsed: data.data.actionsUsed,
          actionsRemaining: data.data.actionsRemaining,
          monthlyLimit: data.data.monthlyLimit,
          breakdown: data.data.breakdown || {},
          billingPeriodStart: data.data.billingPeriodStart,
          billingPeriodEnd: data.data.billingPeriodEnd,
          nearLimit: data.data.nearLimit,
          percentageUsed: data.data.percentageUsed,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load usage data');
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Actions Usage</CardTitle>
          <CardDescription>Loading your usage data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Actions Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!usageData) {
    return null;
  }

  const { actionsUsed, actionsRemaining, monthlyLimit, breakdown, billingPeriodEnd, nearLimit, percentageUsed } = usageData;

  // Calculate days until reset
  const resetDate = new Date(billingPeriodEnd);
  const now = new Date();
  const daysUntilReset = Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Context level icons and labels
  const contextLevelInfo: Record<string, { icon: React.ElementType; label: string; color: string }> = {
    [ContextLevel.MINIMAL]: { icon: Zap, label: 'Minimal', color: 'text-gray-600' },
    [ContextLevel.STANDARD]: { icon: Sparkles, label: 'Standard', color: 'text-blue-600' },
    [ContextLevel.COMPREHENSIVE]: { icon: Brain, label: 'Comprehensive', color: 'text-purple-600' },
    [ContextLevel.COMPREHENSIVE_THINKING]: { icon: Brain, label: 'Thinking', color: 'text-indigo-600' },
  };

  // Calculate total generations by context level
  const totalGenerations = Object.values(breakdown).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-6">
      {/* Main Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            AI Actions Usage
          </CardTitle>
          <CardDescription>
            Your AI action usage for this billing period
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Near Limit Warning */}
          {nearLimit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ⚠️ You're running low on AI actions! Only {actionsRemaining} remaining this month.
                <Button variant="link" className="ml-2 p-0 h-auto" asChild>
                  <a href="/pricing">Upgrade Plan →</a>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Usage Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Actions Used
              </span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {actionsUsed.toLocaleString()} / {monthlyLimit.toLocaleString()}
              </span>
            </div>
            <Progress 
              value={percentageUsed} 
              className={`h-3 ${
                percentageUsed >= 90 
                  ? 'bg-red-200' 
                  : percentageUsed >= 70 
                  ? 'bg-yellow-200' 
                  : 'bg-blue-200'
              }`}
            />
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{percentageUsed.toFixed(1)}% used</span>
              <span>{actionsRemaining.toLocaleString()} remaining</span>
            </div>
          </div>

          {/* Reset Date */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>
              Resets in {daysUntilReset} {daysUntilReset === 1 ? 'day' : 'days'} ({resetDate.toLocaleDateString()})
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown by Context Level */}
      {totalGenerations > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Usage Breakdown</CardTitle>
            <CardDescription>
              Stories generated by context level ({totalGenerations} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(breakdown).map(([level, count]) => {
                const info = contextLevelInfo[level];
                if (!info || count === 0) return null;

                const Icon = info.icon;
                const percentage = (count / totalGenerations) * 100;

                return (
                  <div key={level} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${info.color}`} />
                        <span className="font-medium">{info.label}</span>
                      </div>
                      <span className="text-gray-600 dark:text-gray-400">
                        {count} {count === 1 ? 'story' : 'stories'} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">💡 Tips to Optimize Usage</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>• Use <strong>Minimal</strong> (1 action) for simple stories and quick drafts</p>
          <p>• Use <strong>Standard</strong> (2 actions) for most user stories (recommended)</p>
          <p>• Reserve <strong>Comprehensive</strong> (2 actions) for complex features in established epics</p>
          <p>• Use <strong>Thinking</strong> (3 actions) only for compliance and security stories</p>
          {nearLimit && (
            <p className="text-red-600 dark:text-red-400 font-medium mt-4">
              💰 Need more actions? <a href="/pricing" className="underline">Upgrade your plan</a>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

