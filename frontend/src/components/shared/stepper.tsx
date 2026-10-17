
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  label: string;
  description: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn("flex w-full items-start justify-between gap-4", className)}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;

        return (
          <div key={stepNumber} className="flex flex-1 flex-col gap-2">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted 
                    ? "bg-primary border-primary text-primary-foreground" 
                    : isActive 
                      ? "border-primary text-primary" 
                      : "border-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-bold">{stepNumber}</span>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className={cn(
                  "text-sm font-semibold truncate",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {step.description}
                </span>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="ml-4 h-px flex-1 bg-muted mt-[-20px]" />
            )}
          </div>
        );
      })}
    </div>
  );
}
