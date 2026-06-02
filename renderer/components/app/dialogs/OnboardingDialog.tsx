import { formatDependencyLabel, getMissingInstallDependencies } from "@/components/app/logic/toolInstallDependencies";
import { formatInstallLogText } from "@/components/app/logic/terminalLogText";
import { getNextToolPopoverState } from "@/components/app/logic/toolPopoverPosition";
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
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AgentCatalogEntry, AppSettings, InstalledIde, WorkspaceFramework } from "@shared/appTypes";
import type { StartupDependency, StartupDependencyId } from "@shared/types/startupDependency.types";
import { AlertTriangle, CheckCircle2, ChevronRight, Copy, LoaderCircle, RefreshCcw, Rocket, Wrench, XCircle } from "lucide-react";
import type { MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type OnboardingStep = "dependencies" | "tools" | "settings" | "workspace";

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
  onCopyInstructions: (dependency: StartupDependency) => void;
  onReloadDependencies: () => void;
  onRefreshTools: () => void;
  onInstallDraftChange: (toolId: string, value: string) => void;
  onInstallTool: (toolId: string) => void;
  onSetToolEnabled: (toolId: string, enabled: boolean) => void;
  onChooseWorkspace: () => void;
  onStart: () => void;
};

const ACCENT_OPTIONS: AccentColor[] = ["silver", "green", "blue", "amber", "rose", "violet"];
const THEME_OPTIONS: ThemeMode[] = ["system", "light", "dark"];

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
  onStart
}: OnboardingDialogProps) {
  const [step, setStep] = useState<OnboardingStep>("dependencies");
  const [activeToolPopover, setActiveToolPopover] = useState<ToolPopoverState | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const missingDependencies = dependencies.filter((dependency) => dependency.status === "missing");
  const hasBlockingDependencies = missingDependencies.some((dependency) => dependency.severity === "mandatory");
  const normalizedUserDisplayName = userDisplayName.trim();
  const detectedToolCount = tools.filter((tool) => tool.detected).length;
  const dependencyReport = useMemo(
    () => ({ checkedAt: "", dependencies }),
    [dependencies]
  );
  const hasSelectedWorkspace = Boolean(currentWorkspacePath);
  const activeTool = tools.find((tool) => tool.id === activeToolPopover?.toolId) ?? null;

  useEffect(() => {
    if (open) {
      setStep("dependencies");
      setActiveToolPopover(null);
    }
  }, [open]);

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

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        className="h-[min(84vh,820px)] w-[min(1180px,calc(100vw-2rem))] max-w-none"
        headerTitle={(
          <span className="flex items-center gap-2">
            <Rocket className="size-4 text-primary" />
            Welcome to Nora
        </span>
        )}
      >
        <DialogHeader>
          <DialogTitle>Let&apos;s get Nora ready</DialogTitle>
          <DialogDescription>
            Check the required tools, then choose a few starter settings.
          </DialogDescription>
          {normalizedUserDisplayName ? (
            <div className="pt-1 text-sm text-muted-foreground">
              Setting things up for <span className="font-medium text-foreground">{normalizedUserDisplayName}</span>.
            </div>
          ) : null}
        </DialogHeader>

        <DialogBody className="flex min-h-0 flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`grid size-7 place-items-center rounded-full border text-sm font-semibold ${step === "dependencies" ? "border-primary bg-primary/10 text-primary" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"}`}>
                1
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Dependencies</div>
                <div className="text-xs text-muted-foreground">Check required tools first</div>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className={`grid size-7 place-items-center rounded-full border text-sm font-semibold ${step === "tools" ? "border-primary bg-primary/10 text-primary" : step === "settings" || step === "workspace" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-border/70 bg-background text-muted-foreground"}`}>
                2
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Agent CLIs</div>
                <div className="text-xs text-muted-foreground">Detect and install tools</div>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className={`grid size-7 place-items-center rounded-full border text-sm font-semibold ${step === "settings" ? "border-primary bg-primary/10 text-primary" : step === "workspace" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-border/70 bg-background text-muted-foreground"}`}>
                3
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Settings</div>
                <div className="text-xs text-muted-foreground">Choose starter defaults</div>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className={`grid size-7 place-items-center rounded-full border text-sm font-semibold ${step === "workspace" ? "border-primary bg-primary/10 text-primary" : "border-border/70 bg-background text-muted-foreground"}`}>
                4
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Workspace</div>
                <div className="text-xs text-muted-foreground">Choose your first repo</div>
              </div>
            </div>
          </div>

          {step === "dependencies" ? (
            <div className="rounded-[6px] border border-border/70 bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Dependency check</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Nora needs Git before it can open repositories. Optional entries unlock CLI install and remote workflow features.
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onReloadDependencies} disabled={isLoadingDependencies}>
                    <RefreshCcw className="size-4" />
                    Recheck
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {isLoadingDependencies ? (
                  <div className="flex items-center gap-3 rounded-[6px] border border-border/70 bg-card/70 px-4 py-3 text-sm text-foreground">
                    <LoaderCircle className="size-4 animate-spin text-primary" />
                    Checking dependencies...
                  </div>
                ) : null}
                {dependencies.map((dependency) => {
                  const isAvailable = dependency.status === "available";
                  const isInstalling = installTargetId === dependency.id;
                  return (
                    <div key={dependency.id} className="min-w-0 rounded-[6px] border border-border/70 bg-card/70 p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {isAvailable ? (
                              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                            ) : dependency.severity === "mandatory" ? (
                              <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                            ) : (
                              <XCircle className="size-4 shrink-0 text-muted-foreground" />
                            )}
                            <div className="font-medium text-foreground">{dependency.label}</div>
                            <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              {dependency.severity}
                            </span>
                            <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              {dependency.status}
                            </span>
                          </div>
                          <div className="mt-1.5 text-sm text-muted-foreground">{dependency.summary}</div>
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

                        <div className="flex shrink-0 flex-col gap-2">
                          {dependency.canAutoInstall ? (
                            <Button
                              onClick={() => onInstallDependency(dependency.id)}
                              disabled={isLoadingDependencies || isAvailable}
                            >
                              {isInstalling ? <LoaderCircle className="size-4 animate-spin" /> : <Wrench className="size-4" />}
                              {dependency.autoInstallLabel || "Install"}
                            </Button>
                          ) : null}
                          <Button variant="outline" onClick={() => onCopyInstructions(dependency)}>
                            <Copy className="size-4" />
                            Copy steps
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {installErrorMessage ? (
                <div className="mt-4 rounded-[4px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground">
                  {installErrorMessage}
                </div>
              ) : null}
            </div>
          ) : step === "tools" ? (
            <div className="rounded-[6px] border border-border/70 bg-background/60 p-4">
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
          ) : step === "settings" ? (
            <div className="min-h-0 flex-1">
              <div className="rounded-[6px] border border-border/70 bg-background/60 p-4">
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
                    <span className="text-sm font-medium text-foreground">Theme</span>
                    <Select value={themeMode} onChange={(event) => onThemeModeChange(event.target.value as ThemeMode)}>
                      {THEME_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-foreground">Accent color</span>
                    <Select value={accentColor} onChange={(event) => onAccentColorChange(event.target.value as AccentColor)}>
                      {ACCENT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
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
            <div className="rounded-[6px] border border-border/70 bg-background/60 p-4">
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
          {step !== "dependencies" ? (
            <Button
              variant="outline"
              onClick={() => setStep(step === "workspace" ? "settings" : step === "settings" ? "tools" : "dependencies")}
            >
              Back
            </Button>
          ) : null}
          {step === "dependencies" ? (
            <Button onClick={() => setStep("tools")} disabled={isLoadingDependencies || hasBlockingDependencies}>
              Continue
            </Button>
          ) : step === "tools" ? (
            <Button onClick={() => setStep("settings")}>
              Continue
            </Button>
          ) : step === "settings" ? (
            <Button onClick={() => setStep("workspace")}>
              Continue
            </Button>
          ) : (
            <Button onClick={onStart}>
              Start Nora
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
