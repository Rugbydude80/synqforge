'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Users, Zap, ShoppingCart, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface UsageData {
  tokensUsed: number;
  tokensLimit: number;
  generationsCount: number;
  generationsLimit: number;
  percentUsed: number;
  isOverLimit: boolean;
  remainingTokens: number;
  remainingGenerations: number;
  purchasedTokensAvailable?: number;
}

interface LimitsData {
  monthlyTokens: number;
  monthlyGenerations: number;
  maxStoriesPerGeneration: number;
  maxProjects: number;
  maxUsers: number;
  tier: string;
}

export function UsageDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [limits, setLimits] = useState<LimitsData | null>(null);
  const [billingResetDate, setBillingResetDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      const response = await fetch('/api/usage/current');
      const data = await response.json();

      if (data.success) {
        setUsage(data.usage);
        setLimits(data.limits);
        setBillingResetDate(new Date(data.billingResetDate));
      } else {
        toast.error('Failed to load usage data');
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
      toast.error('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num === Infinity) return '∞';
    return num.toLocaleString();
  };

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'text-red-600';
    if (percent >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handlePurchaseTokens = () => {
    router.push('/settings/billing?action=buy-tokens');
  };

  const handleUpgrade = () => {
    router.push('/pricing');
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted rounded mb-2" />
              <div className="h-2 w-full bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!usage || !limits) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Unable to load usage data</p>
        </CardContent>
      </Card>
    );
  }

  const isUnlimited = limits.monthlyTokens === Infinity;
  const daysUntilReset = billingResetDate
    ? Math.ceil((billingResetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Usage & Limits</h2>
          <p className="text-muted-foreground">
            Current plan: <Badge variant="outline">{limits.tier}</Badge>
            {!isUnlimited && billingResetDate && (
              <span className="ml-2 text-sm">
                Resets in {daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <Button onClick={handleUpgrade} variant="default">
          <TrendingUp className="h-4 w-4 mr-2" />
          Upgrade Plan
        </Button>
      </div>

      {/* Warning Banner */}
      {usage.isOverLimit && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100">Usage Limit Reached</h3>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                  You've reached your monthly AI usage limit. Upgrade your plan or purchase additional tokens to continue using AI features.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handlePurchaseTokens}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Buy Tokens
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleUpgrade}>
                    Upgrade Plan
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Token Usage Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Token Usage</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {formatNumber(usage.tokensUsed)} / {formatNumber(limits.monthlyTokens)}
            </div>
            {!isUnlimited && (
              <>
                <Progress value={usage.percentUsed} className="h-2 mb-2" />
                <p className={`text-sm ${getUsageColor(usage.percentUsed)}`}>
                  {100 - usage.percentUsed}% remaining ({formatNumber(usage.remainingTokens)} tokens)
                </p>
              </>
            )}
            {isUnlimited && (
              <p className="text-sm text-muted-foreground">Unlimited usage</p>
            )}
          </CardContent>
        </Card>

        {/* Generations Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">AI Generations</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {formatNumber(usage.generationsCount)} / {formatNumber(limits.monthlyGenerations)}
            </div>
            {limits.monthlyGenerations !== Infinity && (
              <>
                <Progress
                  value={(usage.generationsCount / limits.monthlyGenerations) * 100}
                  className="h-2 mb-2"
                />
                <p className="text-sm text-muted-foreground">
                  {formatNumber(usage.remainingGenerations)} generations left
                </p>
              </>
            )}
            {limits.monthlyGenerations === Infinity && (
              <p className="text-sm text-muted-foreground">Unlimited generations</p>
            )}
          </CardContent>
        </Card>

        {/* Purchased Tokens Card */}
        {usage.purchasedTokensAvailable !== undefined && usage.purchasedTokensAvailable > 0 && (
          <Card className="border-brand-purple-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Bonus Tokens</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">
                {formatNumber(usage.purchasedTokensAvailable)}
              </div>
              <p className="text-sm text-muted-foreground">
                Additional tokens available
              </p>
              <Button size="sm" variant="outline" className="mt-2" onClick={handlePurchaseTokens}>
                Buy More
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Plan Limits Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Plan Limits</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projects:</span>
                <span className="font-medium">{formatNumber(limits.maxProjects)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Team Members:</span>
                <span className="font-medium">{formatNumber(limits.maxUsers)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stories/Generation:</span>
                <span className="font-medium">{formatNumber(limits.maxStoriesPerGeneration)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Tokens Section */}
      {!isUnlimited && usage.percentUsed > 50 && (
        <Card>
          <CardHeader>
            <CardTitle>Need More Tokens?</CardTitle>
            <CardDescription>
              Purchase additional AI tokens to keep generating stories without interruption
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button onClick={handlePurchaseTokens}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Buy Token Package
              </Button>
              <Button variant="outline" onClick={handleUpgrade}>
                Or Upgrade Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
