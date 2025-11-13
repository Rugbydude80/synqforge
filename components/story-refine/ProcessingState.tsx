'use client';

import { useEffect, useState } from 'react';
import { Loader2, Sparkles, FileText, CheckCircle2, Eye, Zap, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const DETAILED_STEPS = [
  {
    label: 'Analyzing story structure...',
    description: 'Checking narrative flow and pacing',
    icon: FileText,
    duration: 2000,
  },
  {
    label: 'Evaluating clarity...',
    description: 'Identifying ambiguous language',
    icon: Eye,
    duration: 2500,
  },
  {
    label: 'Checking grammar & style...',
    description: 'Reviewing sentence structure',
    icon: CheckCircle2,
    duration: 2000,
  },
  {
    label: 'Applying refinements...',
    description: 'Generating improvements',
    icon: Sparkles,
    duration: 3000,
  },
  {
    label: 'Finalizing changes...',
    description: 'Preparing comparison view',
    icon: Zap,
    duration: 1500,
  },
];

export function ProcessingState() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate progress
    const totalDuration = DETAILED_STEPS.reduce(
      (sum, step) => sum + step.duration,
      0
    );
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 100;
      const newProgress = Math.min((elapsed / totalDuration) * 100, 95);
      setProgress(newProgress);

      // Update current step
      let stepElapsed = 0;
      for (let i = 0; i < DETAILED_STEPS.length; i++) {
        stepElapsed += DETAILED_STEPS[i].duration;
        if (elapsed < stepElapsed) {
          setCurrentStep(i);
          break;
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = DETAILED_STEPS[currentStep]?.icon || Loader2;

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-8">
      {/* Animated Icon */}
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
        <div className="relative bg-primary/10 p-8 rounded-full">
          <CurrentIcon className="h-12 w-12 text-primary animate-spin" />
        </div>
      </div>

      {/* Progress Steps */}
      <div className="w-full max-w-md space-y-4">
        <Progress value={progress} className="h-2" />

        {/* Detailed Checklist UI */}
        <div className="space-y-2">
          {DETAILED_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === currentStep;
            const isComplete = i < currentStep;

            return (
              <div
                key={i}
                className={`flex items-start gap-3 transition-all ${
                  isActive
                    ? 'opacity-100 scale-105'
                    : isComplete
                    ? 'opacity-75'
                    : 'opacity-50'
                }`}
              >
                <div className="mt-0.5">
                  {isComplete ? (
                    <Check className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Icon
                      className={`h-5 w-5 ${
                        isActive
                          ? 'text-primary animate-pulse'
                          : 'text-muted-foreground'
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <div
                    className={`font-medium ${
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {step.description}
                  </div>
                </div>
                {isActive && (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Time Estimate */}
      <p className="text-sm text-muted-foreground">
        This usually takes 30-60 seconds
      </p>
    </div>
  );
}
