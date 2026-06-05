import { formatDependencyLabel, getMissingInstallDependencies } from "@/components/app/logic/toolInstallDependencies";
import { formatInstallLogText } from "@/components/app/logic/terminalLogText";
import { getNextToolPopoverState } from "@/components/app/logic/toolPopoverPosition";
import { buildStartupDependencyCopyText } from "@/components/app/logic/startupDependencyCopyText";
import { AppMark } from "@/components/app/shared/AppMark";
import { AgentToolIcon, ToolPopover, WorkspaceProjectIcon } from "@/components/app/shared/Tooling";
import type { AccentColor, ThemeMode, ToolPopoverState } from "@/components/app/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import type { AgentCatalogEntry, AppSettings, InstalledIde, WorkspaceFramework } from "@shared/appTypes";
import type { StartupDependency, StartupDependencyId } from "@shared/types/startupDependency.types";
import { AlertTriangle, CheckCircle2, ChevronDown, Copy, LoaderCircle, RefreshCcw, Wrench } from "lucide-react";
import type { MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type OnboardingStep = "dependencies" | "tools" | "appearance" | "settings" | "workspace";
type DependencyCopyState = "idle" | "copying" | "copied" | "failed";

export type OnboardingDialogProps = {
  open: boolean;
  dependencies: StartupDependency[];
  isLoadingDependencies: boolean;
  installTargetId: StartupDependencyId | null;
  installErrorMessage: string | null;
  tools: AgentCatalogEntry[];
  installCommandDrafts: Record<string, string>;
  isRefreshingTools: boolean;
  currentWorkspaceName: string | null;
  currentWorkspacePath: string | null;
  currentWorkspaceFramework: WorkspaceFramework | null;
  currentWorkspaceBaseBranch: string | null;
  currentWorkspacePlatform: string | null;
  isChoosingWorkspace: boolean;
  themeMode: ThemeMode;
  accentColor: AccentColor;
  hardwareAccelerationEnabled: boolean;
  workspaceStateStorageMode: AppSettings["workspaceStateStorageMode"];
  installedIdes: InstalledIde[];
  defaultIdeId: string | null;
  userDisplayName: string;
  onThemeModeChange: (mode: ThemeMode) => void;
  onAccentColorChange: (accentColor: AccentColor) => void;
  onHardwareAccelerationChange: (enabled: boolean) => void;
  onWorkspaceStateStorageModeChange: (mode: AppSettings["workspaceStateStorageMode"]) => void;
  onDefaultIdeChange: (ideId: string | null) => void;
  onUserDisplayNameChange: (displayName: string) => void;
  onInstallDependency: (dependencyId: StartupDependencyId) => void;
  onCopyInstructions: (dependency: StartupDependency) => Promise<void>;
  onReloadDependencies: () => void;
  onRefreshTools: () => void;
  onInstallDraftChange: (toolId: string, value: string) => void;
  onInstallTool: (toolId: string) => void;
  onSetToolEnabled: (toolId: string, enabled: boolean) => void;
  onChooseWorkspace: () => void;
  onSkipOnboarding: () => void;
  onStart: () => void;
};

const ACCENT_OPTIONS: AccentColor[] = ["silver", "green", "blue", "amber", "rose", "violet"];
const ACCENT_OPTION_CLASSES: Record<AccentColor, string> = {
  silver: "bg-[hsl(220_9%_46%)]",
  green: "bg-[hsl(161_67%_37%)]",
  blue: "bg-[hsl(213_79%_47%)]",
  amber: "bg-[hsl(32_95%_45%)]",
  rose: "bg-[hsl(346_78%_47%)]",
  violet: "bg-[hsl(262_73%_54%)]"
};
const THEME_OPTIONS: ThemeMode[] = ["system", "light", "dark"];
const THEME_OPTION_LABELS: Record<ThemeMode, string> = {
  system: "System",
  light: "Light",
  dark: "Dark"
};
const ONBOARDING_STEPS: OnboardingStep[] = ["dependencies", "tools", "appearance", "settings", "workspace"];
const ONBOARDING_STEP_COPY: Record<OnboardingStep, { title: string; description: string }> = {
  dependencies: {
    title: "Check local dependencies",
    description: "Make sure Nora can use the required system tools before opening repositories."
  },
  tools: {
    title: "Set up agent CLIs",
    description: "Review detected coding agents and install or enable the tools you want available."
  },
  appearance: {
    title: "Choose your appearance",
    description: "Pick the theme and accent color Nora should use across the app."
  },
  settings: {
    title: "Choose starter settings",
    description: "Set your name, preferred IDE, workspace state location, and rendering defaults."
  },
  workspace: {
    title: "Choose your first workspace",
    description: "Open a repository now, or continue and add one later from the main app."
  }
};

export function OnboardingDialog({
  open,
  dependencies,
  isLoadingDependencies,
  installTargetId,
  installErrorMessage,
  tools,
  installCommandDrafts,
  isRefreshingTools,
  currentWorkspaceName,
  currentWorkspacePath,
  currentWorkspaceFramework,
  currentWorkspaceBaseBranch,
  currentWorkspacePlatform,
  isChoosingWorkspace,
  themeMode,
  accentColor,
  hardwareAccelerationEnabled,
  workspaceStateStorageMode,
  installedIdes,
  defaultIdeId,
  userDisplayName,
  onThemeModeChange,
  onAccentColorChange,
  onHardwareAccelerationChange,
  onWorkspaceStateStorageModeChange,
  onDefaultIdeChange,
  onUserDisplayNameChange,
  onInstallDependency,
  onCopyInstructions,
  onReloadDependencies,
  onRefreshTools,
  onInstallDraftChange,
  onInstallTool,
  onSetToolEnabled,
  onChooseWorkspace,
  onSkipOnboarding,
  onStart
}: OnboardingDialogProps) {
  const [step, setStep] = useState<OnboardingStep>("dependencies");
  const [isSkipConfirmOpen, setIsSkipConfirmOpen] = useState(false);
  const [activeToolPopover, setActiveToolPopover] = useState<ToolPopoverState | null>(null);
  const [expandedDependencyIds, setExpandedDependencyIds] = useState<StartupDependencyId[]>([]);
  const [dependencyCopyStates, setDependencyCopyStates] = useState<Partial<Record<StartupDependencyId, DependencyCopyState>>>({});
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const copiedDependencyTimeoutRef = useRef<number | null>(null);
  const missingDependencies = dependencies.filter((dependency) => dependency.status === "missing");
  const hasBlockingDependencies = missingDependencies.some((dependency) => dependency.severity === "mandatory");
  const mandatoryDependencies = dependencies.filter((dependency) => dependency.severity === "mandatory");
  const optionalDependencies = dependencies.filter((dependency) => dependency.severity === "optional");
  const normalizedUserDisplayName = userDisplayName.trim();
  const detectedToolCount = tools.filter((tool) => tool.detected).length;
  const dependencyReport = useMemo(
    () => ({ checkedAt: "", dependencies }),
    [dependencies]
  );
  const hasSelectedWorkspace = Boolean(currentWorkspacePath);
  const activeTool = tools.find((tool) => tool.id === activeToolPopover?.toolId) ?? null;
  const stepIndex = ONBOARDING_STEPS.indexOf(step);
  const stepNumber = stepIndex + 1;
  const previousStep = stepIndex > 0 ? ONBOARDING_STEPS[stepIndex - 1] : null;
  const nextStep = stepIndex < ONBOARDING_STEPS.length - 1 ? ONBOARDING_STEPS[stepIndex + 1] : null;
  const stepCopy = ONBOARDING_STEP_COPY[step];

  useEffect(() => {
    if (open) {
      setStep("dependencies");
      setIsSkipConfirmOpen(false);
      setActiveToolPopover(null);
      setExpandedDependencyIds([]);
      setDependencyCopyStates({});
      if (copiedDependencyTimeoutRef.current !== null) {
        window.clearTimeout(copiedDependencyTimeoutRef.current);
        copiedDependencyTimeoutRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => () => {
    if (copiedDependencyTimeoutRef.current !== null) {
      window.clearTimeout(copiedDependencyTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!activeToolPopover) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveToolPopover(null);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!popoverRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !popoverRef.current.contains(target)) {
        setActiveToolPopover(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [activeToolPopover]);

  useEffect(() => {
    if (step !== "tools") {
      setActiveToolPopover(null);
    }
  }, [step]);

  const openToolPopover = (toolId: string, event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setActiveToolPopover(getNextToolPopoverState(null, toolId, rect));
  };
  const toggleDependencyExpanded = (dependencyId: StartupDependencyId) => {
    setExpandedDependencyIds((current) =>
      current.includes(dependencyId)
        ? current.filter((item) => item !== dependencyId)
        : [...current, dependencyId]
    );
  };
  const handleCopyDependencyInstructions = async (dependency: StartupDependency): Promise<void> => {
    setDependencyCopyStates((current) => ({ ...current, [dependency.id]: "copying" }));
    try {
      await onCopyInstructions(dependency);
      setDependencyCopyStates((current) => ({ ...current, [dependency.id]: "copied" }));
      if (copiedDependencyTimeoutRef.current !== null) {
        window.clearTimeout(copiedDependencyTimeoutRef.current);
      }
      copiedDependencyTimeoutRef.current = window.setTimeout(() => {
        setDependencyCopyStates((current) => ({ ...current, [dependency.id]: "idle" }));
        copiedDependencyTimeoutRef.current = null;
      }, 1600);
    } catch {
      setDependencyCopyStates((current) => ({ ...current, [dependency.id]: "failed" }));
      if (copiedDependencyTimeoutRef.current !== null) {
        window.clearTimeout(copiedDependencyTimeoutRef.current);
      }
      copiedDependencyTimeoutRef.current = window.setTimeout(() => {
        setDependencyCopyStates((current) => ({ ...current, [dependency.id]: "idle" }));
        copiedDependencyTimeoutRef.current = null;
      }, 2200);
    }
  };

  const handleConfirmSkipOnboarding = (): void => {
    setIsSkipConfirmOpen(false);
    onSkipOnboarding();
  };

  const handleOnboardingDismissAttempt = (): void => {
    setIsSkipConfirmOpen(true);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) {
        handleOnboardingDismissAttempt();
      }
    }}>
      <DialogContent
        className="h-[min(84vh,820px)] w-[min(1180px,calc(100vw-2rem))] max-w-none"
        headerTitle={(
          <span className="flex items-center gap-2">
            <AppMark className="size-5 shrink-0" />
            Welcome to Nora
          </span>
        )}
      >
        <DialogBody className="flex min-h-0 flex-col gap-5">
          <div className="flex items-center gap-3" aria-label={`Onboarding step ${stepNumber} of ${ONBOARDING_STEPS.length}`}>
            <div className="flex max-w-[65vw] items-center gap-2">
              {ONBOARDING_STEPS.map((item, index) => (
                <Tooltip key={item} content={ONBOARDING_STEP_COPY[item].title} side="top" className="z-[40000]">
                  <button
                    type="button"
                    onClick={() => setStep(item)}
                    aria-label={`Go to ${ONBOARDING_STEP_COPY[item].title}`}
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
              {stepNumber} of {ONBOARDING_STEPS.length}
            </div>
          </div>
          <div className="space-y-2 pb-3 pt-3">
            <DialogTitle className="text-2xl">{stepCopy.title}</DialogTitle>
            <DialogDescription>{stepCopy.description}</DialogDescription>
            {normalizedUserDisplayName ? (
              <div className="pt-1 text-sm text-muted-foreground">
                Setting things up for <span className="font-medium text-foreground">{normalizedUserDisplayName}</span>.
              </div>
            ) : null}
          </div>

          {step === "dependencies" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                <div className="text-sm font-medium text-foreground">Dependency check</div>
                <div className="mt-1 text-sm text-muted-foreground">
                    Nora needs git and the GitHub CLI before it can open repositories and use GitHub features. Optional entries unlock CLI install and remote workflow features.
                </div>
              </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onReloadDependencies} disabled={isLoadingDependencies}>
                    <RefreshCcw className="size-4" />
                    Recheck
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {isLoadingDependencies ? (
                  <div className="flex items-center gap-3 rounded-[6px] border border-border/70 bg-card/70 px-4 py-3 text-sm text-foreground md:col-span-2 xl:col-span-3">
                    <LoaderCircle className="size-4 animate-spin text-primary" />
                    Checking dependencies...
                  </div>
                ) : null}
                {[
                  { title: "Mandatory", items: mandatoryDependencies },
                  { title: "Optional", items: optionalDependencies }
                ].map((group) =>
                  group.items.length ? (
                    <div key={group.title} className="md:col-span-2 xl:col-span-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{group.title}</div>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {group.items.map((dependency) => {
                          const isAvailable = dependency.status === "available";
                          const isInstalling = installTargetId === dependency.id;
                          const isExpanded = expandedDependencyIds.includes(dependency.id);
                          const copyState = dependencyCopyStates[dependency.id] ?? "idle";
                          const isCopying = copyState === "copying";
                          const wasCopied = copyState === "copied";
                          const copyFailed = copyState === "failed";
                          const installCommand = buildStartupDependencyCopyText(dependency);
                          const hasDependencyDetails =
                            dependency.summary.trim().length > 0 ||
                            Boolean(dependency.detectedPath) ||
                            dependency.manualInstructions.length > 0;
                          return (
                            <div
                              key={dependency.id}
                              className={[
                                "min-w-0 rounded-[6px] border p-2.5 transition-colors",
                                wasCopied
                                  ? "border-emerald-500/45 bg-emerald-500/10"
                                  : copyFailed
                                  ? "border-destructive/45 bg-destructive/10"
                                  : "border-border/70 bg-card/70"
                              ].join(" ")}
                            >
                              <div className="flex min-w-0 items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                  {isAvailable ? (
                                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                                  ) : dependency.severity === "mandatory" ? (
                                    <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                                  ) : (
                                    <AlertTriangle className="size-4 shrink-0 text-orange-500" />
                                  )}
                                  <div className="min-w-0 truncate font-medium text-foreground">{dependency.label}</div>
                                </div>

                                <div className="flex shrink-0 gap-1.5">
                                  {installCommand ? (
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="outline"
                                      tooltip={isCopying ? "Copying command" : wasCopied ? "Copied command" : copyFailed ? "Copy failed" : "Copy install command"}
                                      className={[
                                        wasCopied ? "border-emerald-500/45 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "",
                                        copyFailed ? "border-destructive/45 bg-destructive/10 text-destructive" : ""
                                      ].filter(Boolean).join(" ") || undefined}
                                      onClick={() => void handleCopyDependencyInstructions(dependency)}
                                      disabled={isCopying}
                                      aria-label={`${isCopying ? "Copying" : wasCopied ? "Copied" : copyFailed ? "Copy failed for" : "Copy install command for"} ${dependency.label}`}
                                    >
                                      {isCopying ? (
                                        <LoaderCircle className="size-4 animate-spin" />
                                      ) : wasCopied ? (
                                        <CheckCircle2 className="size-4 text-emerald-500" />
                                      ) : (
                                        <Copy className="size-4" />
                                      )}
                                    </Button>
                                  ) : null}
                                  {hasDependencyDetails ? (
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="outline"
                                      tooltip={isExpanded ? "Hide details" : "Show details"}
                                      onClick={() => toggleDependencyExpanded(dependency.id)}
                                      aria-expanded={isExpanded}
                                      aria-label={isExpanded ? `Hide ${dependency.label} details` : `Show ${dependency.label} details`}
                                    >
                                      <ChevronDown className={`size-4 transition ${isExpanded ? "rotate-180" : ""}`} />
                                    </Button>
                                  ) : null}
                                  {dependency.canAutoInstall ? (
                                    <Button
                                      size="sm"
                                      tooltip={isAvailable ? `${dependency.label} is already installed` : dependency.autoInstallLabel || `Install ${dependency.label}`}
                                      onClick={() => onInstallDependency(dependency.id)}
                                      disabled={isLoadingDependencies || isAvailable}
                                    >
                                      {isInstalling ? <LoaderCircle className="size-4 animate-spin" /> : <Wrench className="size-4" />}
                                      {dependency.autoInstallLabel || "Install"}
                                    </Button>
                                  ) : null}
                                </div>
                              </div>

                              {isExpanded ? (
                                <div className="mt-3">
                                  {dependency.summary.trim().length > 0 ? (
                                    <div className="mt-1.5 text-sm text-muted-foreground">{dependency.summary}</div>
                                  ) : null}
                                  {dependency.detectedPath ? (
                                    <div className="mt-2 break-all rounded-[4px] border border-border/60 bg-background px-3 py-1.5 text-xs text-foreground">
                                      {dependency.detectedPath}
                                    </div>
                                  ) : null}
                                  {!isAvailable && dependency.manualInstructions.length ? (
                                    <div className="mt-2 space-y-1.5">
                                      {dependency.manualInstructions.map((instruction) => (
                                        <div key={instruction} className="break-words rounded-[4px] border border-border/60 bg-background px-3 py-1.5 text-sm text-foreground">
                                          {instruction}
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null
                )}
              </div>

              {installErrorMessage ? (
                <div className="mt-4 rounded-[4px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground">
                  {installErrorMessage}
                </div>
              ) : null}
            </div>
          ) : step === "tools" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Agent CLI setup</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Review the supported tools on this machine and install the ones you want available in Nora.
                  </div>
                </div>
                <Button variant="outline" onClick={onRefreshTools} disabled={isRefreshingTools}>
                  <RefreshCcw className={`size-4 ${isRefreshingTools ? "animate-spin" : ""}`} />
                  Recheck
                </Button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {tools.map((tool) => {
                  const canInstall = !tool.detected && tool.installTemplate.trim().length > 0;
                  const needsManualSetup = !tool.detected && tool.installTemplate.trim().length === 0;
                  const installCommand = (installCommandDrafts[tool.id]?.trim() || tool.installTemplate).trim();
                  const missingInstallDependencies = getMissingInstallDependencies(installCommand, dependencyReport);
                  const hasMissingInstallDependencies = missingInstallDependencies.length > 0;
                  const missingInstallDependencyLabel = missingInstallDependencies.map((dependencyId) => formatDependencyLabel(dependencyId)).join(", ");
                  return (
                    <div key={tool.id} className="min-w-0 rounded-[6px] border border-border/70 bg-card/70 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <AgentToolIcon toolId={tool.id} label={tool.label} className="mt-0.5 size-9" imageClassName="size-5 rounded-sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate font-medium text-foreground">{tool.label}</div>
                              <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                {tool.detected ? "installed" : "missing"}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">{tool.description}</div>
                            <div className="mt-2 break-words text-xs text-muted-foreground">
                              {tool.detectedPath || (tool.installTemplate.trim().length ? tool.installTemplate : "Install this CLI separately, then recheck.")}
                            </div>
                            {canInstall && hasMissingInstallDependencies ? (
                              <div className="mt-2 text-xs text-amber-600">
                                Requires {missingInstallDependencyLabel}. Install dependencies first.
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {canInstall && hasMissingInstallDependencies ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStep("dependencies")}
                            disabled={isRefreshingTools}
                          >
                            Install dependencies
                          </Button>
                        ) : canInstall ? (
                          <Button
                            type="button"
                            onClick={(event) => openToolPopover(tool.id, event)}
                            disabled={tool.installStatus === "running" || isRefreshingTools}
                          >
                            {tool.installStatus === "running" ? <LoaderCircle className="size-4 animate-spin" /> : <Wrench className="size-4" />}
                            Install
                          </Button>
                        ) : tool.detected ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => onSetToolEnabled(tool.id, !tool.enabled)}
                            disabled={tool.installStatus === "running" || isRefreshingTools}
                          >
                            {tool.enabled ? "Disable in Nora" : "Enable in Nora"}
                          </Button>
                        ) : needsManualSetup ? (
                          <Button type="button" variant="outline" disabled>
                            Setup unavailable
                          </Button>
                        ) : null}
                      </div>

                      {tool.installLog.length ? (
                        <pre className="terminal-text mt-3 max-h-28 overflow-auto rounded-[4px] border border-border/60 bg-black/30 p-2 text-xs leading-5 text-muted-foreground">
                          {formatInstallLogText(tool.installLog)}
                        </pre>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-[6px] border border-border/70 bg-card/70 px-3 py-2 text-sm text-muted-foreground">
                {detectedToolCount} of {tools.length} supported agent CLIs detected.
              </div>
            </div>
          ) : step === "appearance" ? (
            <div className="min-h-0 flex-1">
              <div>
                <div className="text-sm font-medium text-foreground">Appearance</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Choose the visual defaults Nora should use across the app.
                </div>

                <div className="mt-4 grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Theme</div>
                    <div className="grid grid-cols-3 gap-2">
                      {THEME_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => onThemeModeChange(option)}
                          aria-pressed={themeMode === option}
                          className={[
                            "rounded-[5px] border p-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            themeMode === option
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border/70 bg-background/50 text-muted-foreground hover:border-primary/35 hover:text-foreground"
                          ].join(" ")}
                        >
                          <div
                            className={[
                              "h-20 overflow-hidden rounded-[4px] border",
                              option === "dark"
                                ? "border-zinc-700 bg-zinc-950"
                                : option === "light"
                                  ? "border-zinc-200 bg-white"
                                  : "border-border bg-zinc-100"
                            ].join(" ")}
                          >
                            <div
                              className={[
                                "flex h-full flex-col",
                                option === "system" ? "bg-gradient-to-br from-white from-50% to-zinc-950 to-50%" : ""
                              ].join(" ")}
                            >
                              <div
                                className={[
                                  "h-2.5 border-b",
                                  option === "dark"
                                    ? "border-zinc-800 bg-zinc-900"
                                    : option === "light"
                                      ? "border-zinc-200 bg-zinc-50"
                                      : "border-zinc-400/40 bg-white/75"
                                ].join(" ")}
                              />
                              <div className="grid min-h-0 flex-1 grid-cols-[0.9fr_1.6fr_0.9fr]">
                                <div
                                  className={[
                                    "border-r p-1",
                                    option === "dark"
                                      ? "border-zinc-800 bg-zinc-900"
                                      : option === "light"
                                        ? "border-zinc-200 bg-zinc-100"
                                        : "border-zinc-400/40 bg-zinc-200/85"
                                  ].join(" ")}
                                >
                                  <div className={["h-1.5 rounded-full", option === "dark" ? "bg-zinc-700" : "bg-zinc-300"].join(" ")} />
                                  <div className={["mt-1 h-1.5 w-2/3 rounded-full", option === "dark" ? "bg-zinc-800" : "bg-zinc-400/60"].join(" ")} />
                                </div>
                                <div
                                  className={[
                                    "p-1",
                                    option === "dark" ? "bg-zinc-950" : option === "light" ? "bg-white" : "bg-white/80"
                                  ].join(" ")}
                                >
                                  <div className={["h-2 rounded-sm", option === "dark" ? "bg-zinc-800" : "bg-zinc-200"].join(" ")} />
                                  <div className={["mt-1 h-1.5 w-4/5 rounded-full", option === "dark" ? "bg-zinc-700" : "bg-zinc-300"].join(" ")} />
                                </div>
                                <div
                                  className={[
                                    "border-l p-1",
                                    option === "dark"
                                      ? "border-zinc-800 bg-zinc-900"
                                      : option === "light"
                                        ? "border-zinc-200 bg-zinc-100"
                                        : "border-zinc-400/40 bg-zinc-800/85"
                                  ].join(" ")}
                                >
                                  <div className={["h-1.5 rounded-full", option === "light" ? "bg-zinc-300" : "bg-zinc-600"].join(" ")} />
                                  <div className={["mt-1 h-1.5 w-1/2 rounded-full", option === "light" ? "bg-zinc-400/60" : "bg-zinc-700"].join(" ")} />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-center text-xs font-medium">{THEME_OPTION_LABELS[option]}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 md:pl-4">
                    <div className="text-sm font-medium text-foreground">Accent color</div>
                    <div className="flex justify-center pt-3">
                      <div className="grid grid-cols-6 gap-2 rounded-[6px] border border-border/70 bg-card/50 p-2">
                        {ACCENT_OPTIONS.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => onAccentColorChange(option)}
                            aria-label={`Use ${option} accent color`}
                            aria-pressed={accentColor === option}
                            title={option}
                            className={[
                              "grid h-9 w-9 place-items-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                              ACCENT_OPTION_CLASSES[option],
                              accentColor === option
                                ? "border-foreground shadow-[0_0_0_2px_hsl(var(--background)),0_0_0_4px_hsl(var(--foreground))]"
                                : "border-border/70 hover:scale-105"
                            ].join(" ")}
                          >
                            {accentColor === option ? (
                              <span className="size-2 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]" />
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : step === "settings" ? (
            <div className="min-h-0 flex-1">
              <div>
                <div className="text-sm font-medium text-foreground">Starter settings</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  These are persisted immediately, so this screen doubles as a simple first-run preferences step.
                </div>

                <div className="mt-4 grid gap-4">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-foreground">Your name</span>
                    <Input
                      value={userDisplayName}
                      onChange={(event) => onUserDisplayNameChange(event.target.value)}
                      placeholder="Your name"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-foreground">Default IDE</span>
                    <Select value={defaultIdeId || ""} onChange={(event) => onDefaultIdeChange(event.target.value || null)}>
                      <option value="">No preference</option>
                      {installedIdes.map((ide) => (
                        <option key={ide.id} value={ide.id}>
                          {ide.name}
                        </option>
                      ))}
                    </Select>
                  </label>

                  <label className="flex items-center justify-between gap-3 rounded-[4px] border border-border/70 bg-card/70 px-3 py-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">Workspace state location</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Choose whether tasks, specs, boards, and split views live in your home `.nora` folder or in each repo&apos;s `.nora` folder.
                      </div>
                      <div className="mt-3">
                        <Select
                          value={workspaceStateStorageMode}
                          onChange={(event) => onWorkspaceStateStorageModeChange(event.target.value as AppSettings["workspaceStateStorageMode"])}
                        >
                          <option value="repo">Inside each repo (.nora)</option>
                          <option value="home">In home directory (~/.nora)</option>
                        </Select>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between gap-3 rounded-[4px] border border-border/70 bg-card/70 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-foreground">Hardware acceleration</div>
                      <div className="mt-1 text-xs text-muted-foreground">Disable this if you hit GPU rendering issues.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={hardwareAccelerationEnabled}
                      onChange={(event) => onHardwareAccelerationChange(event.target.checked)}
                      className="size-4"
                    />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm font-medium text-foreground">Choose your first workspace</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Pick a repository now, or continue and add one later from the main app.
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={onChooseWorkspace} disabled={isChoosingWorkspace}>
                  {isChoosingWorkspace ? <LoaderCircle className="size-4 animate-spin" /> : null}
                  Choose repository
                </Button>
              </div>

              <div className="mt-4 rounded-[6px] border border-border/70 bg-card/70 p-3">
                {hasSelectedWorkspace ? (
                  <>
                    <div className="flex items-center gap-3">
                      <WorkspaceProjectIcon
                        framework={currentWorkspaceFramework}
                        label={currentWorkspaceName || "Selected workspace"}
                        className="size-8 shrink-0"
                        imageClassName="size-5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground">{currentWorkspaceName}</div>
                        <div className="mt-1 break-all text-sm text-muted-foreground">{currentWorkspacePath}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {currentWorkspaceFramework ? (
                        <Badge variant="outline">
                          {currentWorkspaceFramework.label}
                          {currentWorkspaceFramework.version ? ` ${currentWorkspaceFramework.version}` : ""}
                        </Badge>
                      ) : null}
                      {currentWorkspaceBaseBranch ? (
                        <Badge variant="outline">{currentWorkspaceBaseBranch}</Badge>
                      ) : null}
                      {currentWorkspacePlatform ? (
                        <Badge variant="outline">{currentWorkspacePlatform}</Badge>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">No workspace selected yet.</div>
                )}
              </div>
            </div>
          )}
        </DialogBody>

        {activeTool && activeToolPopover && step === "tools" ? (
          <ToolPopover
            ref={popoverRef}
            tool={activeTool}
            draftValue={installCommandDrafts[activeTool.id] ?? activeTool.installTemplate}
            top={0}
            left={0}
            onClose={() => setActiveToolPopover(null)}
            onInstallDraftChange={onInstallDraftChange}
            onInstallTool={onInstallTool}
            onRemoveTool={() => undefined}
            allowRemoval={false}
            centered
          />
        ) : null}

        <DialogFooter>
          <div className="flex w-full items-center justify-between gap-2">
            <Button variant="ghost" onClick={handleOnboardingDismissAttempt}>
              Skip onboarding
            </Button>
            <div className="flex items-center gap-2">
              {previousStep ? (
                <Button
                  variant="outline"
                  onClick={() => setStep(previousStep)}
                >
                  Back
                </Button>
              ) : null}
              {step === "dependencies" ? (
                <Button onClick={() => setStep("tools")} disabled={isLoadingDependencies || hasBlockingDependencies}>
                  Continue
                </Button>
              ) : step === "tools" ? (
                <Button onClick={() => setStep("appearance")}>
                  Continue
                </Button>
              ) : nextStep ? (
                <Button onClick={() => setStep(nextStep)}>
                  Continue
                </Button>
              ) : (
                <Button onClick={onStart}>
                  Start Nora
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={isSkipConfirmOpen} onOpenChange={setIsSkipConfirmOpen}>
      <DialogContent
        className="max-w-[480px]"
        onClose={() => setIsSkipConfirmOpen(false)}
        headerTitle="Skip onboarding?"
      >
        <DialogBody className="pt-6">
          <DialogDescription className="text-sm leading-relaxed">
            You can finish setup later. Any preferences you changed during onboarding are saved, and you can reopen onboarding from Settings when you are ready.
          </DialogDescription>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsSkipConfirmOpen(false)}>
            Continue setup
          </Button>
          <Button onClick={handleConfirmSkipOnboarding}>
            Skip for now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
