import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  id: number;
  label: string;
}

interface WizardStepperProps {
  currentStep: number;
  steps: Step[];
}

export function WizardStepper({ currentStep, steps }: WizardStepperProps) {
  return (
    <nav aria-label="Progreso" className="mb-8">
      <ol className="flex items-center w-full overflow-x-auto overflow-y-hidden pb-2 snap-x">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;

          return (
            <li 
              key={step.id} 
              className={cn(
                "relative flex items-center flex-shrink-0 snap-start",
                index !== steps.length - 1 ? "w-full" : "w-auto"
              )}
            >
              <div className="flex flex-col items-center group">
                <div
                  className={cn(
                    "flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200",
                    isCompleted 
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" 
                      : isActive 
                        ? "border-2 border-primary text-primary bg-primary/5" 
                        : "border-2 border-border text-muted-foreground bg-muted/30"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    <span className="text-xs font-semibold">{step.id}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "absolute -bottom-5 sm:-bottom-6 text-xs font-medium whitespace-nowrap flex-shrink-0",
                    isActive ? "text-primary font-semibold" : isCompleted ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index !== steps.length - 1 && (
                <div 
                  className="flex-1 mx-2 h-0.5 flex-shrink-0 rounded-full overflow-hidden bg-border"
                  aria-hidden="true"
                >
                  <div
                    className={cn(
                      "h-full transition-all duration-500 rounded-full bg-primary",
                      isCompleted ? "w-full" : "w-0"
                    )}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
