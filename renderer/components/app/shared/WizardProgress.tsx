import type { WizardProgressProps } from "@/components/app/types/wizardProgress.types";
import { Tooltip } from "@/components/ui/tooltip";

export function WizardProgress<TStep extends string>({
  ariaLabel,
  steps,
  activeStep,
  onStepChange
}: WizardProgressProps<TStep>) {
  const activeIndex = steps.findIndex((step) => step.id === activeStep);

  return (
    <div className="flex items-center gap-3" aria-label={`${ariaLabel} step ${activeIndex + 1} of ${steps.length}`}>
      <div className="flex max-w-[65vw] items-center gap-2">
        {steps.map((step, index) => (
          <Tooltip key={step.id} content={step.title} side="top" className="z-[40000]">
            <button
              type="button"
              onClick={() => onStepChange(step.id)}
              aria-label={`Go to ${step.title}`}
              aria-current={index === activeIndex ? "step" : undefined}
              className={[
                "flex h-5 items-center rounded-full transition-[width] duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                index === activeIndex ? "w-16" : "w-8"
              ].join(" ")}
            >
              <div
                className={[
                  "h-1.5 w-full rounded-full transition-colors duration-200 ease-out",
                  index === activeIndex ? "bg-primary" : index < activeIndex ? "bg-muted-foreground/45" : "bg-muted"
                ].join(" ")}
              />
            </button>
          </Tooltip>
        ))}
      </div>
      <div className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
        {activeIndex + 1} of {steps.length}
      </div>
    </div>
  );
}
