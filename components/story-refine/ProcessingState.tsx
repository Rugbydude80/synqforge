'use client';

import { useEffect, useState } from 'react';
import { Loader2, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const PROCESSING_STEPS = [
  { label: 'Analyzing your story...', icon: FileText, duration: 2000 },
  { label: 'Applying your instructions...', icon: Sparkles, duration: 3000 },
  { label: 'Generating refined version...', icon: Loader2, duration: 4000 },
  { label: 'Finalizing changes...', icon: CheckCircle2, duration: 1000 },
];

export function ProcessingState() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate progress
    const totalDuration = PROCESSING_STEPS.reduce(
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
      for (let i = 0; i < PROCESSING_STEPS.length; i++) {
        stepElapsed += PROCESSING_STEPS[i].duration;
        if (elapsed < stepElapsed) {
          setCurrentStep(i);
          break;
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = PROCESSING_STEPS[currentStep]?.icon || Loader2;

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

        <div className="space-y-3">
          {PROCESSING_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isComplete = index < currentStep;

            return (
              <div
                key={index}
                className={`flex items-center gap-3 transition-all ${
                  isActive
                    ? 'text-foreground font-medium'
                    : isComplete
                    ? 'text-muted-foreground line-through'
                    : 'text-muted-foreground/50'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'animate-spin' : ''}`} />
                <span>{step.label}</span>
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

