import { PROJECT_SCAFFOLD_FRAMEWORKS } from "@/components/app/constants/projectScaffoldRegistry";
import { resolveProjectScaffoldOptionLogoUrl } from "@/components/app/constants/projectScaffoldOptionLogos";
import { buildProjectScaffoldPrompt, resolveProjectScaffoldOptions } from "@/components/app/logic/projectScaffoldPrompt";
import { ProjectScaffoldCompactTile } from "@/components/app/shared/ProjectScaffoldCompactTile";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { AddWorkspaceDialogProps } from "@/components/app/types/component.types";
import type {
  ProjectScaffoldFramework,
  ProjectScaffoldFrameworkCategory,
  ProjectScaffoldOption,
  ProjectScaffoldWizardStep
} from "@/components/app/types/projectScaffoldWizard.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { canPresetAgentInitialPrompt, canPresetAgentWorkspaceTrust } from "@shared/agentStartupCapabilities";
import { isAgentToolAvailable } from "@shared/agentToolState";
import { Bot, Check, FolderPlus, HardDrive, Search, ServerCog, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const SCAFFOLD_STEPS: ProjectScaffoldWizardStep[] = ["framework", "components", "testing", "agent"];
const SCAFFOLD_STEP_COPY: Record<ProjectScaffoldWizardStep, { title: string; description: string }> = {
  framework: {
    title: "Choose a framework",
    description: "Pick the project family the agent should scaffold."
  },
  components: {
    title: "Choose components",
    description: "Select framework-specific libraries and setup choices."
  },
  testing: {
    title: "Choose test tooling",
    description: "Add the test and quality tools this project should start with."
  },
  agent: {
    title: "Choose an agent",
    description: "Review the generated scaffold request and send it to an available agent."
  }
};
const FRAMEWORK_CATEGORY_OPTIONS: Array<{ id: ProjectScaffoldFrameworkCategory | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "web", label: "Web" },
  { id: "backend", label: "Backend" },
  { id: "mobile", label: "Mobile" },
  { id: "desktop", label: "Desktop" },
  { id: "data", label: "Data" }
];

function recommendedOptionIds(framework: ProjectScaffoldFramework, optionKind: "componentOptions" | "testingOptions"): string[] {
  return framework[optionKind].filter((option) => option.recommended).map((option) => option.id);
}

function buildScaffoldOptionTooltip(option: ProjectScaffoldOption) {
  return (
    <div className="space-y-1">
      <div className="font-medium">{option.label}</div>
      <div>{option.description}</div>
      {option.recommended ? <div className="pt-1 text-[11px] text-muted-foreground">Recommended starter choice</div> : null}
    </div>
  );
}

export function AddWorkspaceDialog({
  open,
  tools,
  preferredAgentToolId,
  onOpenChange,
  onChooseLocal,
  onChooseRemote,
  onCreateNewProjectAgent
}: AddWorkspaceDialogProps) {
  const [isScaffoldWizardOpen, setIsScaffoldWizardOpen] = useState(false);
  const [step, setStep] = useState<ProjectScaffoldWizardStep>("framework");
  const [selectedFrameworkId, setSelectedFrameworkId] = useState(PROJECT_SCAFFOLD_FRAMEWORKS[0]?.id ?? "");
  const [frameworkSearch, setFrameworkSearch] = useState("");
  const [selectedFrameworkCategory, setSelectedFrameworkCategory] = useState<ProjectScaffoldFrameworkCategory | "all">("all");
  const [projectName, setProjectName] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const selectedFramework = PROJECT_SCAFFOLD_FRAMEWORKS.find((framework) => framework.id === selectedFrameworkId) ?? PROJECT_SCAFFOLD_FRAMEWORKS[0];
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>(() =>
    selectedFramework ? recommendedOptionIds(selectedFramework, "componentOptions") : []
  );
  const [selectedTestingIds, setSelectedTestingIds] = useState<string[]>(() =>
    selectedFramework ? recommendedOptionIds(selectedFramework, "testingOptions") : []
  );
  const availableTools = useMemo(() => tools.filter((tool) => isAgentToolAvailable(tool)), [tools]);
  const frameworkCategoryCounts = useMemo(() => {
    const counts: Record<ProjectScaffoldFrameworkCategory | "all", number> = {
      all: PROJECT_SCAFFOLD_FRAMEWORKS.length,
      web: 0,
      backend: 0,
      mobile: 0,
      desktop: 0,
      data: 0
    };
    for (const framework of PROJECT_SCAFFOLD_FRAMEWORKS) {
      counts[framework.category] += 1;
    }
    return counts;
  }, []);
  const filteredFrameworks = useMemo(() => {
    const query = frameworkSearch.trim().toLowerCase();
    return PROJECT_SCAFFOLD_FRAMEWORKS.filter((framework) => {
      if (selectedFrameworkCategory !== "all" && framework.category !== selectedFrameworkCategory) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [
        framework.label,
        framework.language,
        framework.description,
        framework.category,
        framework.starterCommand ?? "",
        ...framework.componentOptions.map((option) => option.label),
        ...framework.testingOptions.map((option) => option.label)
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [frameworkSearch, selectedFrameworkCategory]);
  const defaultToolId = useMemo(() => {
    if (preferredAgentToolId && availableTools.some((tool) => tool.id === preferredAgentToolId)) {
      return preferredAgentToolId;
    }

    return availableTools[0]?.id ?? "";
  }, [availableTools, preferredAgentToolId]);
  const [selectedToolId, setSelectedToolId] = useState(defaultToolId);
  const stepIndex = SCAFFOLD_STEPS.indexOf(step);
  const previousStep = stepIndex > 0 ? SCAFFOLD_STEPS[stepIndex - 1] : null;
  const nextStep = stepIndex < SCAFFOLD_STEPS.length - 1 ? SCAFFOLD_STEPS[stepIndex + 1] : null;
  const stepCopy = SCAFFOLD_STEP_COPY[step];
  const selectedComponents = selectedFramework
    ? resolveProjectScaffoldOptions(selectedFramework, selectedComponentIds, "componentOptions")
    : [];
  const selectedTesting = selectedFramework
    ? resolveProjectScaffoldOptions(selectedFramework, selectedTestingIds, "testingOptions")
    : [];
  const scaffoldPrompt = selectedFramework
    ? buildProjectScaffoldPrompt({
      framework: selectedFramework,
      components: selectedComponents,
      testing: selectedTesting
    })
    : "";
  const normalizedProjectName = projectName.trim();
  const canLaunchScaffoldAgent = Boolean(
    normalizedProjectName && selectedFramework && selectedToolId && onCreateNewProjectAgent && !isCreatingProject
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const initialFramework = PROJECT_SCAFFOLD_FRAMEWORKS[0];
    setIsScaffoldWizardOpen(false);
    setStep("framework");
    setSelectedFrameworkId(initialFramework?.id ?? "");
    setFrameworkSearch("");
    setSelectedFrameworkCategory("all");
    setSelectedComponentIds(initialFramework ? recommendedOptionIds(initialFramework, "componentOptions") : []);
    setSelectedTestingIds(initialFramework ? recommendedOptionIds(initialFramework, "testingOptions") : []);
    setProjectName("");
    setIsCreatingProject(false);
  }, [open]);

  useEffect(() => {
    setSelectedToolId(defaultToolId);
  }, [defaultToolId]);

  const handleSelectFramework = (framework: ProjectScaffoldFramework): void => {
    setSelectedFrameworkId(framework.id);
    setSelectedComponentIds(recommendedOptionIds(framework, "componentOptions"));
    setSelectedTestingIds(recommendedOptionIds(framework, "testingOptions"));
  };

  const toggleComponent = (optionId: string): void => {
    setSelectedComponentIds((current) =>
      current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]
    );
  };

  const toggleTesting = (optionId: string): void => {
    setSelectedTestingIds((current) =>
      current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]
    );
  };

  const handleCreateNewProject = async (): Promise<void> => {
    if (!canLaunchScaffoldAgent || !selectedFramework || !onCreateNewProjectAgent) {
      return;
    }

    setIsCreatingProject(true);
    try {
      const canPresetInitialPrompt = canPresetAgentInitialPrompt(selectedToolId);
      await onCreateNewProjectAgent(
        {
          toolId: selectedToolId,
          name: `Scaffold ${selectedFramework.label} project`,
          task: scaffoldPrompt,
          commandOverride: "",
          mode: "write",
          target: { kind: "root" },
          branchCheckout: null,
          worktreeBranch: null,
          prepareWorktree: false,
          launchSource: "dialog",
          initialPromptDelivery: canPresetInitialPrompt ? "launch-command" : "terminal",
          startupTrustMode: canPresetAgentWorkspaceTrust(selectedToolId) ? "trusted-workspace" : "default"
        },
        normalizedProjectName
      );
    } finally {
      setIsCreatingProject(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={isScaffoldWizardOpen ? "h-[min(84vh,760px)] w-[min(980px,calc(100vw-2rem))] max-w-none" : undefined}
        onClose={() => onOpenChange(false)}
        headerTitle={isScaffoldWizardOpen ? "New project" : "Add workspace"}
      >
        <DialogHeader>
          <DialogDescription>
            {isScaffoldWizardOpen
              ? "Choose a framework and options, then create a git-initialized workspace for an agent to scaffold."
              : "Choose whether to open an existing repository or scaffold a new project with an agent."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className={isScaffoldWizardOpen ? "flex min-h-0 flex-col gap-5" : "space-y-3"}>
          {isScaffoldWizardOpen ? (
            <>
              <div className="flex items-center gap-3" aria-label={`New project step ${stepIndex + 1} of ${SCAFFOLD_STEPS.length}`}>
                <div className="flex max-w-[65vw] items-center gap-2">
                  {SCAFFOLD_STEPS.map((item, index) => (
                    <Tooltip key={item} content={SCAFFOLD_STEP_COPY[item].title} side="top" className="z-[40000]">
                      <button
                        type="button"
                        onClick={() => setStep(item)}
                        aria-label={`Go to ${SCAFFOLD_STEP_COPY[item].title}`}
                        className={[
                          "flex h-5 items-center rounded-full transition-[width] duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          index === stepIndex ? "w-16" : "w-8"
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "h-1.5 w-full rounded-full transition-colors duration-200 ease-out",
                            index === stepIndex ? "bg-primary" : index < stepIndex ? "bg-muted-foreground/45" : "bg-muted"
                          ].join(" ")}
                        />
                      </button>
                    </Tooltip>
                  ))}
                </div>
                <div className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
                  {stepIndex + 1} of {SCAFFOLD_STEPS.length}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-semibold tracking-normal">{stepCopy.title}</div>
                <div className="text-sm text-muted-foreground">{stepCopy.description}</div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {step === "framework" ? (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          value={frameworkSearch}
                          onChange={(event) => setFrameworkSearch(event.target.value)}
                          placeholder="Search frameworks, languages, or libraries"
                          aria-label="Search frameworks"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {FRAMEWORK_CATEGORY_OPTIONS.map((category) => {
                          const selected = category.id === selectedFrameworkCategory;
                          return (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => setSelectedFrameworkCategory(category.id)}
                              className={[
                                "h-8 rounded-[5px] border px-2.5 text-xs font-medium transition hover:border-primary/40 hover:bg-accent/30",
                                selected ? "border-primary/60 bg-primary/10 text-primary" : "border-border/70 bg-background/40 text-muted-foreground"
                              ].join(" ")}
                            >
                              {category.label} {frameworkCategoryCounts[category.id]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <div>
                        Showing {filteredFrameworks.length} of {PROJECT_SCAFFOLD_FRAMEWORKS.length}
                      </div>
                      {frameworkSearch || selectedFrameworkCategory !== "all" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setFrameworkSearch("");
                            setSelectedFrameworkCategory("all");
                          }}
                          className="font-medium text-primary hover:underline"
                        >
                          Clear filters
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {filteredFrameworks.length ? (
                        filteredFrameworks.map((framework) => {
                          const selected = framework.id === selectedFramework?.id;
                          return (
                            <ProjectScaffoldCompactTile
                              key={framework.id}
                              label={framework.label}
                              subtitle={framework.language}
                              logoUrl={framework.logoUrl}
                              selected={selected}
                              onClick={() => handleSelectFramework(framework)}
                              ariaLabel={`${framework.label}. ${framework.description}`}
                              tooltipContent={(
                                <div className="space-y-1">
                                  <div className="font-medium">{framework.label}</div>
                                  <div>{framework.description}</div>
                                  {framework.starterCommand ? (
                                    <div className="pt-1 font-mono text-[11px]">{framework.starterCommand}</div>
                                  ) : null}
                                </div>
                              )}
                            />
                          );
                        })
                      ) : (
                        <div className="rounded-[6px] border border-border/70 bg-background/40 p-4 text-sm text-muted-foreground sm:col-span-2 lg:col-span-4">
                          No frameworks match the current filters.
                        </div>
                      )}
                    </div>
                    {selectedFramework ? (
                      <div className="rounded-[6px] border border-border/70 bg-background/40 p-4">
                        <div className="flex items-center gap-3">
                          <div className="grid size-10 shrink-0 place-items-center rounded-[5px] border border-border/70 bg-background/70">
                            <img src={selectedFramework.logoUrl} alt="" className="size-6" draggable={false} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{selectedFramework.label}</div>
                            <div className="text-xs text-muted-foreground">{selectedFramework.language}</div>
                          </div>
                        </div>
                        <div className="mt-3 text-sm text-muted-foreground">{selectedFramework.description}</div>
                        {selectedFramework.starterCommand ? (
                          <div className="mt-3 rounded-[4px] border border-border/60 bg-muted/35 px-3 py-2 font-mono text-xs text-muted-foreground">
                            {selectedFramework.starterCommand}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {step === "components" && selectedFramework ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {selectedFramework.componentOptions.map((option) => {
                      const selected = selectedComponentIds.includes(option.id);
                      return (
                        <ProjectScaffoldCompactTile
                          key={option.id}
                          label={option.label}
                          subtitle={option.recommended ? "Recommended" : null}
                          logoUrl={resolveProjectScaffoldOptionLogoUrl(option.id)}
                          selected={selected}
                          onClick={() => toggleComponent(option.id)}
                          ariaLabel={`${option.label}. ${option.description}`}
                          tooltipContent={buildScaffoldOptionTooltip(option)}
                        />
                      );
                    })}
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
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
                    <div className="space-y-3">
                      <div className="rounded-[6px] border border-border/70 bg-background/40 p-4">
                        <div className="text-sm font-medium">Scaffold request</div>
                        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-[4px] border border-border/60 bg-muted/35 p-3 text-xs leading-5 text-muted-foreground">
                          {scaffoldPrompt}
                        </pre>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="rounded-[6px] border border-border/70 bg-background/40 p-4">
                        <label className="text-sm font-medium" htmlFor="new-project-name">
                          Project folder name
                        </label>
                        <Input
                          id="new-project-name"
                          className="mt-2"
                          value={projectName}
                          onChange={(event) => setProjectName(event.target.value)}
                          placeholder={selectedFramework ? `${selectedFramework.id}-app` : "my-new-project"}
                        />
                        <div className="mt-2 text-xs text-muted-foreground">
                          Nora will ask where to create this folder, initialize git, open it as a workspace, then launch the agent.
                        </div>
                      </div>
                      {availableTools.length ? (
                        <div className="space-y-2">
                          {availableTools.map((tool) => {
                            const selected = tool.id === selectedToolId;
                            return (
                              <button
                                key={tool.id}
                                type="button"
                                onClick={() => setSelectedToolId(tool.id)}
                                className={[
                                  "flex w-full items-center gap-3 rounded-[6px] border px-3 py-3 text-left transition hover:border-primary/40 hover:bg-accent/30",
                                  selected ? "border-primary/60 bg-primary/10" : "border-border/70 bg-background/40"
                                ].join(" ")}
                              >
                                <AgentToolIcon toolId={tool.id} label={tool.label} className="size-8 shrink-0" imageClassName="size-5" />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium">{tool.label}</div>
                                  {tool.id === preferredAgentToolId ? (
                                    <div className="mt-0.5 text-xs text-muted-foreground">Preferred agent</div>
                                  ) : null}
                                </div>
                                {selected ? <Check className="size-4 text-primary" /> : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-[6px] border border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
                          No enabled agent CLIs are available. Enable an agent in Settings or onboarding first.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onChooseLocal}
                className="flex w-full items-start gap-3 rounded-[4px] border border-border/70 bg-background/40 px-4 py-4 text-left transition hover:border-primary/40 hover:bg-accent/30"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-[4px] border border-border/70 bg-background/60 text-primary">
                  <HardDrive className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">Local folder</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Pick a repository from a local disk or an already mounted network drive.
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={onChooseRemote}
                className="flex w-full items-start gap-3 rounded-[4px] border border-border/70 bg-background/40 px-4 py-4 text-left transition hover:border-primary/40 hover:bg-accent/30"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-[4px] border border-border/70 bg-background/60 text-primary">
                  <ServerCog className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">Remote over SSH</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Mount an SSH host, then choose a repository on it as if it were local.
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setIsScaffoldWizardOpen(true)}
                className="flex w-full items-start gap-3 rounded-[4px] border border-border/70 bg-background/40 px-4 py-4 text-left transition hover:border-primary/40 hover:bg-accent/30"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-[4px] border border-border/70 bg-background/60 text-primary">
                  <FolderPlus className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">New project</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Select a framework and starter options, then send the scaffold request to an agent.
                  </div>
                </div>
              </button>
            </>
          )}
        </DialogBody>
        <DialogFooter>
          {isScaffoldWizardOpen ? (
            <div className="flex w-full items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => setIsScaffoldWizardOpen(false)}>
                Add existing
              </Button>
              <div className="flex items-center gap-2">
                {previousStep ? (
                  <Button variant="outline" onClick={() => setStep(previousStep)}>
                    Back
                  </Button>
                ) : null}
                {nextStep ? (
                  <Button onClick={() => setStep(nextStep)}>
                    Continue
                  </Button>
                ) : (
                  <Button onClick={() => void handleCreateNewProject()} disabled={!canLaunchScaffoldAgent}>
                    <Bot className="size-4" />
                    {isCreatingProject ? "Creating..." : "Create with agent"}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="size-3.5" />
                Framework scaffolding uses your enabled agent tools.
              </div>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
