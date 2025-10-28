'use client';

/**
 * Context Selector Component
 * Allows users to select AI context level with tier-based restrictions
 */

import { useState } from 'react';
import { UserTier, ContextLevel, CONTEXT_CONFIGS } from '@/lib/types/context.types';
import { ContextAccessService } from '@/lib/services/context-access.service';
import { Lock, Zap, Brain, Sparkles, Info } from 'lucide-react';

interface ContextSelectorProps {
  userTier: UserTier;
  actionsUsed: number;
  monthlyLimit: number;
  selectedLevel: ContextLevel;
  onLevelChange: (level: ContextLevel) => void;
  epicId?: string;
  projectId: string;
}

export function ContextSelector({
  userTier,
  actionsUsed,
  monthlyLimit,
  selectedLevel,
  onLevelChange,
  epicId,
  projectId,
}: ContextSelectorProps) {
  const [showDetails, setShowDetails] = useState(false);

  const actionsRemaining = monthlyLimit - actionsUsed;

  const contextOptions = [
    {
      level: ContextLevel.MINIMAL,
      icon: Zap,
      label: 'Minimal',
      badge: 'Fastest',
      description: 'Basic generation with no project context',
      actions: 1,
      available: ContextAccessService.canAccessContextLevel(userTier, ContextLevel.MINIMAL),
    },
    {
      level: ContextLevel.STANDARD,
      icon: Sparkles,
      label: 'Standard',
      badge: 'Recommended',
      description: 'Uses project roles, terminology, and example stories',
      actions: 2,
      available: ContextAccessService.canAccessContextLevel(userTier, ContextLevel.STANDARD),
    },
    {
      level: ContextLevel.COMPREHENSIVE,
      icon: Brain,
      label: 'Comprehensive',
      badge: 'Best Quality',
      description: 'Semantic search finds top 5 similar stories in epic',
      actions: 2,
      available: ContextAccessService.canAccessContextLevel(userTier, ContextLevel.COMPREHENSIVE),
      requiresEpic: true,
    },
    {
      level: ContextLevel.COMPREHENSIVE_THINKING,
      icon: Brain,
      label: 'Comprehensive + Thinking',
      badge: 'Expert Mode',
      description: 'Deep reasoning for complex compliance/security stories',
      actions: 3,
      available: ContextAccessService.canAccessContextLevel(userTier, ContextLevel.COMPREHENSIVE_THINKING),
      requiresEpic: true,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Context Level
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            More context = better accuracy, more AI actions
          </p>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Info className="w-3 h-3" />
          {showDetails ? 'Hide' : 'Show'} details
        </button>
      </div>

      {/* Usage Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 dark:text-gray-400">
            AI Actions Used
          </span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {actionsUsed.toLocaleString()} / {monthlyLimit.toLocaleString()}
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              actionsUsed / monthlyLimit > 0.9
                ? 'bg-red-500'
                : actionsUsed / monthlyLimit > 0.7
                ? 'bg-yellow-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min((actionsUsed / monthlyLimit) * 100, 100)}%` }}
          />
        </div>
        {actionsRemaining < 10 && (
          <p className="text-xs text-red-600 dark:text-red-400">
            ⚠️ Low on actions! Only {actionsRemaining} remaining this month.
          </p>
        )}
      </div>

      {/* Context Options */}
      <div className="space-y-2">
        {contextOptions.map((option) => {
          const isSelected = selectedLevel === option.level;
          const isDisabledNoEpic = option.requiresEpic && !epicId;
          const isDisabledTier = !option.available;
          const isDisabled = isDisabledNoEpic || isDisabledTier;
          const canAfford = actionsRemaining >= option.actions;

          return (
            <div
              key={option.level}
              className={`
                relative border rounded-lg p-4 cursor-pointer transition-all
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={() => {
                if (!isDisabled && canAfford) {
                  onLevelChange(option.level);
                }
              }}
            >
              {/* Lock Icon for Unavailable Tiers */}
              {isDisabledTier && (
                <div className="absolute top-2 right-2">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
              )}

              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`
                  p-2 rounded-lg 
                  ${isSelected ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800'}
                `}>
                  <option.icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {option.label}
                    </span>
                    <span className={`
                      text-xs px-2 py-0.5 rounded-full
                      ${isSelected 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200' 
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }
                    `}>
                      {option.badge}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {option.description}
                  </p>

                  {/* Actions Required */}
                  <div className="flex items-center gap-4 text-xs">
                    <span className={`font-medium ${canAfford ? 'text-gray-700 dark:text-gray-300' : 'text-red-600 dark:text-red-400'}`}>
                      {option.actions} {option.actions === 1 ? 'action' : 'actions'}
                    </span>
                    {!canAfford && (
                      <span className="text-red-600 dark:text-red-400">
                        Insufficient actions
                      </span>
                    )}
                  </div>

                  {/* Feature List (if details shown) */}
                  {showDetails && (
                    <ul className="mt-2 space-y-1">
                      {CONTEXT_CONFIGS[option.level].features.map((feature, i) => (
                        <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Warnings */}
                  {isDisabledNoEpic && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      ℹ️ Requires story to be in an epic
                    </p>
                  )}

                  {/* Upgrade CTA */}
                  {isDisabledTier && (
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {ContextAccessService.getUpgradeMessage(userTier, option.level)}
                      </p>
                      <a 
                        href="/pricing" 
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        Upgrade Now →
                      </a>
                    </div>
                  )}
                </div>

                {/* Radio Button */}
                {!isDisabled && (
                  <div className={`
                    w-4 h-4 rounded-full border-2 flex items-center justify-center
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-300 dark:border-gray-600'
                    }
                  `}>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Estimated Cost */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            This generation will use:
          </span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {CONTEXT_CONFIGS[selectedLevel].actionsRequired} AI {CONTEXT_CONFIGS[selectedLevel].actionsRequired === 1 ? 'action' : 'actions'}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Estimated tokens:</span>
          <span>{CONTEXT_CONFIGS[selectedLevel].tokenEstimate.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

