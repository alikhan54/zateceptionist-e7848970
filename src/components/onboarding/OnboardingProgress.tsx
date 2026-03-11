import { Check, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ONBOARDING_STEPS } from '@/pages/onboarding/constants';

interface OnboardingProgressProps {
  currentStep: number;
  skippedSteps: string[];
  completedSteps: string[];
}

export function OnboardingProgress({
  currentStep,
  skippedSteps,
  completedSteps,
}: OnboardingProgressProps) {
  return (
    <div className="flex items-center justify-center gap-1 md:gap-2">
      {ONBOARDING_STEPS.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = completedSteps.includes(step.id);
        const isSkipped = skippedSteps.includes(step.id);
        const isPast = index < currentStep;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                  isActive && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                  isCompleted && "bg-green-500 text-white",
                  isSkipped && "bg-muted text-muted-foreground",
                  !isActive && !isCompleted && !isSkipped && isPast && "bg-green-500 text-white",
                  !isActive && !isCompleted && !isSkipped && !isPast && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted || (isPast && !isSkipped) ? (
                  <Check className="h-4 w-4" />
                ) : isSkipped ? (
                  <SkipForward className="h-3 w-3" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1 max-w-[60px] text-center leading-tight hidden md:block",
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
            </div>

            {/* Connector line */}
            {index < ONBOARDING_STEPS.length - 1 && (
              <div
                className={cn(
                  "h-[2px] w-6 md:w-10 mx-1",
                  isPast ? "bg-green-500" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
