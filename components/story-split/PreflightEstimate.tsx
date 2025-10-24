'use client';

import { AlertCircle, Info, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { AIActionEstimate } from '@/lib/services/ai-actions-metering.service';

interface PreflightEstimateProps {
  estimate: AIActionEstimate | null;
  isLoading?: boolean;
}

export function PreflightEstimate({ estimate, isLoading }: PreflightEstimateProps) {
  if (isLoading) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Calculating cost estimate...
        </AlertDescription>
      </Alert>
    );
  }

  if (!estimate) {
    return null;
  }

  const { estimatedCost, currentUsage, allowance, remainingActions, wouldExceed, recommendation } = estimate;
  const usagePercentage = allowance > 0 ? Math.round((currentUsage / allowance) * 100) : 0;
  const projectedUsage = currentUsage + estimatedCost;
  const projectedPercentage = allowance > 0 ? Math.round((projectedUsage / allowance) * 100) : 0;

  const variant = wouldExceed ? 'destructive' : usagePercentage >= 90 ? 'default' : 'default';
  const Icon = wouldExceed ? AlertCircle : usagePercentage >= 90 ? AlertCircle : Zap;

  return (
    <div className="space-y-3">
      {/* Cost Summary */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Estimated Cost</span>
        </div>
        <Badge variant="secondary">
          {estimatedCost} {estimatedCost === 1 ? 'AI Action' : 'AI Actions'}
        </Badge>
      </div>

      {/* Usage Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Current Usage</span>
          <span className="font-medium">
            {currentUsage} / {allowance} actions
          </span>
        </div>
        <Progress value={usagePercentage} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{usagePercentage}% used</span>
          <span>{remainingActions} remaining</span>
        </div>
      </div>

      {/* Projected Usage After Operation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">After This Operation</span>
          <span className={`font-medium ${wouldExceed ? 'text-destructive' : ''}`}>
            {projectedUsage} / {allowance} actions
          </span>
        </div>
        <Progress 
          value={Math.min(projectedPercentage, 100)} 
          className={`h-2 ${wouldExceed ? 'bg-destructive/20' : ''}`}
        />
      </div>

      {/* Warning or Recommendation */}
      {recommendation && (
        <Alert variant={variant}>
          <Icon className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {recommendation}
            {wouldExceed && (
              <div className="mt-2 space-x-2">
                <a href="/settings/billing" className="text-sm underline">
                  Upgrade Plan
                </a>
                <span className="text-muted-foreground">or</span>
                <a href="/settings/billing?tab=overages" className="text-sm underline">
                  Buy Overage Pack
                </a>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

