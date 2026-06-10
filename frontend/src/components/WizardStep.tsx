import { cn } from "@/lib/utils";

interface Step {
  id: number;
  label: string;
}

interface WizardStepProps {
  currentStep: number;
  steps: Step[];
}

export function WizardStep({ currentStep, steps }: WizardStepProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center w-full">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;

          return (
            <li
              key={step.id}
              className={cn(
                "relative flex items-center",
                index !== steps.length - 1 ? "w-full" : "w-auto"
              )}
            >
              <div className="flex flex-col items-center group">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors duration-200",
                    isCompleted
                      ? "bg-primary border-primary text-primary-foreground"
                      : isActive
                        ? "border-primary text-primary"
                        : "border-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <span className="text-sm font-bold">✓</span>
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "absolute -bottom-6 text-xs font-medium whitespace-nowrap",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index !== steps.length - 1 && (
                <div
                  className="flex-1 mx-4 h-0.5"
                  aria-hidden="true"
                >
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      isCompleted ? "bg-primary w-full" : "bg-muted w-0"
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
