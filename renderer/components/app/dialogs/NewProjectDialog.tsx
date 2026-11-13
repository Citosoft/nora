import { FrameworkStep } from "@/components/app/dialogs/new-project/FrameworkStep";
import { ReviewStep } from "@/components/app/dialogs/new-project/ReviewStep";
import { resolveProjectScaffoldOptionLogoUrl } from "@/components/app/constants/projectScaffoldOptionLogos";
import { ProjectScaffoldCompactTile } from "@/components/app/shared/ProjectScaffoldCompactTile";
import { WizardProgress } from "@/components/app/shared/WizardProgress";
import { ProjectDialogFrame } from "@/components/app/shared/ProjectDialogFrame";
import { useProjectScaffold } from "@/components/app/hooks/useProjectScaffold";
import type { ProjectScaffoldOption } from "@/components/app/types/projectScaffoldWizard.types";
import type { NewProjectDialogProps } from "@/components/app/types/projectDialog.types";
import { Button } from "@/components/ui/button";
import { Bot, LoaderCircle } from "lucide-react";

function buildScaffoldOptionTooltip(option: ProjectScaffoldOption) {
  return (
    <div className="space-y-1">
      <div className="font-medium">{option.label}</div>
      <div>{option.description}</div>
      {option.recommended ? (
        <div className="pt-1 text-[11px] text-muted-foreground">
          Recommended starter choice
        </div>
      ) : null}
    </div>
  );
}

export function NewProjectDialog(props: NewProjectDialogProps) {
  const wizard = useProjectScaffold(props);
  const {
    step,
    setStep,
    selectedFramework,
    isCreatingProject,
    error,
    selectedComponentIds,
    selectedTestingIds,
    previousStep,
    nextStep,
    progressSteps,
    stepCopy,
    componentGroups,
    canLaunchScaffoldAgent,
    toggleComponent,
    toggleTesting,
    handleCreateNewProject,
  } = wizard;
  return (
    <ProjectDialogFrame
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="New project"
      description="Choose a framework and starter options, then let an agent build your project."
      busy={isCreatingProject}
      wide
    >
      <fieldset
        disabled={isCreatingProject}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 pb-5">
          <WizardProgress
            ariaLabel="New project"
            steps={progressSteps}
            activeStep={step}
            onStepChange={setStep}
          />
          <div className="space-y-2">
            <div className="text-sm font-semibold">{stepCopy.title}</div>
            <div className="text-xs text-muted-foreground">
              {stepCopy.description}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {step === "framework" ? <FrameworkStep wizard={wizard} /> : null}

            {step === "components" && selectedFramework ? (
              <div className="space-y-5">
                {componentGroups.map((group) => (
                  <section
                    key={group.category}
                    aria-labelledby={`component-group-${group.category}`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <h3
                        id={`component-group-${group.category}`}
                        className="text-xs font-semibold text-foreground"
                      >
                        {group.label}
                      </h3>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {group.options.length}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {group.options.map((option) => {
                        const selected = selectedComponentIds.includes(
                          option.id,
                        );
                        return (
                          <ProjectScaffoldCompactTile
                            key={option.id}
                            label={option.label}
                            subtitle={option.recommended ? "Recommended" : null}
                            logoUrl={resolveProjectScaffoldOptionLogoUrl(
                              option.id,
                            )}
                            selected={selected}
                            onClick={() => toggleComponent(option.id)}
                            ariaLabel={`${option.label}. ${option.description}`}
                            tooltipContent={buildScaffoldOptionTooltip(option)}
                          />
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}

            {step === "testing" && selectedFramework ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {selectedFramework.testingOptions.map((option) => {
                  const selected = selectedTestingIds.includes(option.id);
                  return (
                    <ProjectScaffoldCompactTile
                      key={option.id}
                      label={option.label}
                      subtitle={option.recommended ? "Recommended" : null}
                      logoUrl={resolveProjectScaffoldOptionLogoUrl(option.id)}
                      selected={selected}
                      onClick={() => toggleTesting(option.id)}
                      ariaLabel={`${option.label}. ${option.description}`}
                      tooltipContent={buildScaffoldOptionTooltip(option)}
                    />
                  );
                })}
              </div>
            ) : null}

            {step === "agent" ? (
              <ReviewStep
                wizard={wizard}
                preferredAgentToolId={props.preferredAgentToolId}
              />
            ) : null}
          </div>
          {error ? (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {error}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 border-t border-border bg-muted/30 px-5 py-3">
          <div className="flex w-full items-center justify-between gap-2">
            <Button size="sm" variant="ghost" onClick={props.onBack}>
              Back to projects
            </Button>
            <div className="flex items-center gap-2">
              {previousStep ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStep(previousStep)}
                >
                  Back
                </Button>
              ) : null}
              {nextStep ? (
                <Button size="sm" onClick={() => setStep(nextStep)}>
                  Continue
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => void handleCreateNewProject()}
                  disabled={!canLaunchScaffoldAgent}
                >
                  {isCreatingProject ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Bot className="size-4" />
                  )}
                  {isCreatingProject ? "Creating..." : "Create with agent"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </fieldset>
    </ProjectDialogFrame>
  );
}
