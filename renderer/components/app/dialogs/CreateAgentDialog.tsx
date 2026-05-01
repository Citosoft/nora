import { AGENT_ROLE_OPTIONS, getAgentRolePrompt } from "@/components/app/logic/agentRoles";
import { createLaunchTargetFormState, launchTargetModeFromTarget, resolveSupportedLaunchTargetMode } from "@/components/app/logic/createAgentLaunchTarget";
import { useWorkspaceAgentContextSources } from "@/components/app/hooks/useWorkspaceAgentContextSources";
import { AgentContextPicker } from "@/components/app/shared/AgentContextPicker";
import { Field } from "@/components/app/shared/Field";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { AgentRoleId, CreateAgentDialogProps, LaunchTargetMode } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { isAgentToolAvailable } from "@shared/agentToolState";
import type {
  CreateAgentPayload,
  TerminalPreset,
  WorktreeTarget
} from "@shared/appTypes";
import { Bot, Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const WORKTREE_BRANCH_PREFIX_OPTIONS = [
  { value: "feature", label: "Feature" },
  { value: "bug", label: "Bug" },
  { value: "chore", label: "Chore" },
  { value: "hotfix", label: "Hotfix" },
  { value: "docs", label: "Docs" }
];

const CREATE_AGENT_WIZARD_STEPS = [
  { id: "agent", label: "Agent" },
  { id: "workspace", label: "Workspace" },
  { id: "context", label: "Context" }
] as const;

type PreparePresetEntry = {
  value: string;
  sourceLabel: "Workspace" | "Global";
  preset: TerminalPreset;
  command: string;
};

function formatPresetCommand(preset: TerminalPreset): string {
  return preset.commands
    .map((command) => command.trim())
    .filter((command) => command.length > 0)
    .join(" && ");
}

function buildPreparePresetEntries(
  presets: TerminalPreset[],
  sourceLabel: PreparePresetEntry["sourceLabel"],
  valuePrefix: string
): PreparePresetEntry[] {
  return presets.reduce<PreparePresetEntry[]>((entries, preset) => {
    const command = formatPresetCommand(preset);
    if (!command) {
      return entries;
    }

    entries.push({
      value: `${valuePrefix}:${preset.id}`,
      sourceLabel,
      preset,
      command
    });
    return entries;
  }, []);
}

function findPreparePresetEntryByCommand(entries: PreparePresetEntry[], command: string | null | undefined): PreparePresetEntry | null {
  const normalizedCommand = (command || "").trim();
  if (!normalizedCommand) {
    return null;
  }

  return entries.find((entry) => entry.command === normalizedCommand) ?? null;
}

export function CreateAgentDialog({
  open,
  project,
  tools,
  agentSkillCatalogs,
  workspaceTasks,
  worktrees,
  projectBranches,
  activeBranch,
  defaultLaunchTargetMode,
  defaultWorktreePrepareCommand,
  defaults,
  workspaceTerminalPresets,
  globalTerminalPresets,
  onOpenChange,
  onCreateAgent
}: CreateAgentDialogProps) {
  const detectedTools = useMemo(() => tools.filter((tool) => isAgentToolAvailable(tool)), [tools]);
  const availableTasks = useMemo(() => workspaceTasks.filter((task) => !task.completed), [workspaceTasks]);
  const wasOpenRef = useRef(false);
  const [launchTargetMode, setLaunchTargetMode] = useState<LaunchTargetMode>("current-branch");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedTaskPath, setSelectedTaskPath] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<AgentRoleId>("developer");
  const currentBranchLabel = activeBranch || project?.baseBranch || "unknown";
  const [formState, setFormState] = useState<CreateAgentPayload>({
    toolId: "",
    name: "",
    task: "",
    commandOverride: "",
    mode: "write",
    target: { kind: "new" },
    branchCheckout: null,
    worktreeBranch: null
  });
  const [branchPrefix, setBranchPrefix] = useState(WORKTREE_BRANCH_PREFIX_OPTIONS[0].value);
  const [branchName, setBranchName] = useState("");
  const [selectedPreparePresetValue, setSelectedPreparePresetValue] = useState("");
  const [contextSelections, setContextSelections] = useState<NonNullable<CreateAgentPayload["contextSelections"]>>([]);
  const { sources: contextSources, isLoading: isLoadingContextSources } = useWorkspaceAgentContextSources(project?.id || null, undefined, {
    enabled: open
  });
  const workspacePresetEntries = useMemo(
    () => buildPreparePresetEntries(workspaceTerminalPresets, "Workspace", "workspace"),
    [workspaceTerminalPresets]
  );
  const globalPresetEntries = useMemo(
    () => buildPreparePresetEntries(globalTerminalPresets, "Global", "global"),
    [globalTerminalPresets]
  );
  const preparePresetEntries = useMemo(
    () => [...workspacePresetEntries, ...globalPresetEntries],
    [workspacePresetEntries, globalPresetEntries]
  );
  const selectedPreparePreset = useMemo(
    () => preparePresetEntries.find((entry) => entry.value === selectedPreparePresetValue) ?? null,
    [preparePresetEntries, selectedPreparePresetValue]
  );
  const selectedToolSkillCatalog = useMemo(
    () => agentSkillCatalogs.find((catalog) => catalog.toolId === formState.toolId) || null,
    [agentSkillCatalogs, formState.toolId]
  );

  const selectedExistingWorktree = (() => {
    const target = formState.target;
    return target.kind === "existing"
      ? worktrees.find((worktree) => worktree.id === target.worktreeId) || null
      : null;
  })();

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const defaultTask = availableTasks[0] ?? null;
      const defaultTarget: WorktreeTarget = { kind: "new" };
      const initialTarget =
        defaults?.target?.kind === "session-default"
          ? defaultTarget
          : defaults?.target ?? defaultTarget;
      const initialMode = defaults?.target
        ? launchTargetModeFromTarget(initialTarget)
        : resolveSupportedLaunchTargetMode(defaultLaunchTargetMode, worktrees, projectBranches);
      const initialLaunchState = createLaunchTargetFormState(
        initialMode,
        worktrees,
        projectBranches
      );
      const initialPreparePreset = initialMode === "new"
        ? findPreparePresetEntryByCommand(preparePresetEntries, defaultWorktreePrepareCommand)
        : null;
      setFormState({
        toolId: defaults?.toolId ?? detectedTools[0]?.id ?? "",
        name: "",
        task: defaultTask?.title ?? "",
        commandOverride: "",
        mode: defaults?.mode ?? "write",
        ...initialLaunchState,
        target: defaults?.target ? initialTarget : initialLaunchState.target,
        prepareWorktree: !!initialPreparePreset,
        prepareCommand: initialPreparePreset?.command ?? ""
      });
      setCurrentStepIndex(
        defaults?.initialWizardStepIndex != null
          ? Math.max(0, Math.min(CREATE_AGENT_WIZARD_STEPS.length - 1, defaults.initialWizardStepIndex))
          : 0
      );
      setSelectedTaskPath(defaultTask?.path ?? "");
      setSelectedRoleId("developer");
      setLaunchTargetMode(initialMode);
      setBranchPrefix(WORKTREE_BRANCH_PREFIX_OPTIONS[0].value);
      setBranchName("");
      setSelectedPreparePresetValue(initialPreparePreset?.value ?? "");
      setContextSelections(defaults?.contextSelections ?? []);
    }
    wasOpenRef.current = open;
  }, [
    open,
    detectedTools,
    defaults,
    defaultLaunchTargetMode,
    defaultWorktreePrepareCommand,
    availableTasks,
    worktrees,
    projectBranches,
    preparePresetEntries,
    defaults?.initialWizardStepIndex
  ]);

  const handleLaunchTargetChange = (value: string) => {
    const nextMode: LaunchTargetMode =
      value === "current-branch" ||
      value === "new" ||
      value === "existing" ||
      value === "branch-existing" ||
      value === "branch-new"
        ? value
        : "current-branch";
    setLaunchTargetMode(nextMode);
    setFormState((current) => ({
      ...current,
      ...createLaunchTargetFormState(nextMode, worktrees, projectBranches, nextMode === "new" ? !!selectedPreparePreset : false),
      prepareCommand: nextMode === "new" ? selectedPreparePreset?.command ?? "" : current.prepareCommand
    }));
  };

  const handlePreparePresetChange = (value: string) => {
    const nextPreset = preparePresetEntries.find((entry) => entry.value === value) ?? null;
    setSelectedPreparePresetValue(value);
    setFormState((current) => ({
      ...current,
      prepareWorktree: !!nextPreset,
      prepareCommand: nextPreset?.command ?? ""
    }));
  };

  const dialogHeader = (
    <div className="flex items-center gap-2">
      <Bot className="size-5 text-foreground" aria-hidden />
      <span>New agent session</span>
    </div>
  );
  const handleWizardStepClick = (index: number) => {
    setCurrentStepIndex(index);
  };
  const launchTargetSummary =
    launchTargetMode === "new"
      ? branchName.trim()
        ? `New worktree • ${branchPrefix}/${branchName.trim()}`
        : "New worktree"
      : launchTargetMode === "existing"
        ? selectedExistingWorktree
          ? `Existing worktree • ${selectedExistingWorktree.branch}`
          : "Existing worktree"
        : launchTargetMode === "branch-existing"
          ? formState.branchCheckout?.branchName.trim()
            ? `Checkout branch • ${formState.branchCheckout.branchName.trim()}`
            : "Checkout existing branch"
          : launchTargetMode === "branch-new"
            ? formState.branchCheckout?.branchName.trim()
              ? `Create branch • ${formState.branchCheckout.branchName.trim()}`
              : "Create new branch"
            : `Current branch • ${currentBranchLabel}`;

  const isWorkspaceStepBlocked =
    (launchTargetMode === "existing" && formState.target.kind === "existing" && !formState.target.worktreeId) ||
    (launchTargetMode === "branch-existing" && !projectBranches.length) ||
    ((launchTargetMode === "branch-existing" || launchTargetMode === "branch-new") &&
      !formState.branchCheckout?.branchName.trim()) ||
    (launchTargetMode === "new" && !branchName.trim());
  const isLaunchBlocked =
    !detectedTools.length ||
    !formState.toolId ||
    (
      formState.target.kind === "existing" &&
      formState.mode === "write" &&
      !!selectedExistingWorktree?.writerAgentId
    ) ||
    isWorkspaceStepBlocked;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[min(720px,calc(100vh-2rem))] max-h-[min(720px,calc(100vh-2rem))] w-[min(640px,calc(100vw-2rem))]"
        onClose={() => onOpenChange(false)}
        headerTitle={dialogHeader}
      >
        <DialogBody className="min-h-0 overflow-y-auto px-6 pb-4 pt-3">
          <div className="flex min-h-0 flex-col gap-5">
            <div className="rounded-md border border-border/60 bg-muted/15 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">
              Start a new AI agent in its own terminal for this project. Use the steps to pick which CLI to run, which
              checkout or worktree it should use, and any optional conversation context—from other Nora agents or
              matching local CLI transcripts for this folder.
            </div>

            <nav aria-label="Wizard steps">
              <div className="flex w-full border-b border-border" role="tablist">
                {CREATE_AGENT_WIZARD_STEPS.map((step, index) => {
                  const isActive = index === currentStepIndex;
                  const isComplete = index < currentStepIndex;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-current={isActive ? "step" : undefined}
                      className={cn(
                        "group relative flex min-w-0 flex-1 flex-col items-center gap-2 px-1 pb-3 pt-0.5 outline-none transition-colors",
                        "focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => handleWizardStepClick(index)}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors",
                          isComplete
                            ? "border border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "border border-border/80 bg-muted/50 text-muted-foreground group-hover:bg-muted"
                        )}
                        aria-hidden
                      >
                        {isComplete ? <Check className="size-4" strokeWidth={2.5} /> : index + 1}
                      </span>
                      <span className="w-full max-w-[9rem] truncate text-center text-xs font-medium leading-tight sm:max-w-none sm:text-sm">
                        {step.label}
                      </span>
                      <span
                        className={cn(
                          "pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] rounded-t-[2px] transition-opacity duration-200",
                          isActive ? "bg-primary opacity-100" : "bg-primary/0 opacity-0"
                        )}
                        aria-hidden
                      />
                    </button>
                  );
                })}
              </div>
            </nav>

            <div className="space-y-8 pt-6">
              {currentStepIndex === 0 ? (
                <div className="space-y-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Agent CLI">
                      <Select
                        value={formState.toolId}
                        onChange={(event) => setFormState((current) => ({ ...current, toolId: event.target.value }))}
                      >
                        {detectedTools.map((tool) => (
                          <option key={tool.id} value={tool.id}>
                            <span className="flex min-w-0 items-center gap-2">
                              <AgentToolIcon
                                toolId={tool.id}
                                label={tool.label}
                                className="size-5 shrink-0 rounded-sm"
                                imageClassName="size-4 rounded-sm"
                              />
                              <span className="min-w-0 truncate">
                                {tool.label}
                                {tool.detectedCommand ? ` (${tool.detectedCommand})` : ""}
                              </span>
                            </span>
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Agent name">
                      <Input
                        value={formState.name}
                        onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Planner"
                      />
                    </Field>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-3">
                    <Field label="Role">
                      <Select
                        value={selectedRoleId}
                        onChange={(event) => {
                          const nextRoleId = AGENT_ROLE_OPTIONS.find((role) => role.id === event.target.value)?.id ?? "developer";
                          setSelectedRoleId(nextRoleId);
                        }}
                      >
                        {AGENT_ROLE_OPTIONS.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Task">
                      <Select
                        value={selectedTaskPath}
                        onChange={(event) => {
                          const nextTaskPath = event.target.value;
                          const nextTask = availableTasks.find((task) => task.path === nextTaskPath) ?? null;
                          setSelectedTaskPath(nextTaskPath);
                          setFormState((current) => ({
                            ...current,
                            task: nextTask?.title ?? ""
                          }));
                        }}
                      >
                        <option value="">No task</option>
                        {availableTasks.map((task) => (
                          <option key={task.path} value={task.path}>
                            {task.title}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Access mode">
                      <Select
                        value={formState.mode}
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            mode: event.target.value === "read" ? "read" : "write"
                          }))
                        }
                      >
                        <option value="write">Can edit</option>
                        <option value="read">Read only</option>
                      </Select>
                    </Field>
                  </div>
                </div>
              ) : null}

              {currentStepIndex === 1 ? (
                <div className="space-y-8">
                  <div className="space-y-5">
                    <Field label="Launch target">
                      <Select value={launchTargetMode} onChange={(event) => handleLaunchTargetChange(event.target.value)}>
                        <option value="current-branch">Current branch [{currentBranchLabel}]</option>
                        <option value="new">New worktree</option>
                        {worktrees.length ? <option value="existing">Existing worktree</option> : null}
                        <option value="branch-existing">Checkout existing branch</option>
                        <option value="branch-new">Create and checkout new branch</option>
                      </Select>
                    </Field>
                    {launchTargetMode === "existing" ? (
                      <Field label="Existing worktree">
                        <Select
                          value={formState.target.kind === "existing" ? formState.target.worktreeId : ""}
                          onChange={(event) =>
                            setFormState((current) => ({
                              ...current,
                              target: { kind: "existing", worktreeId: event.target.value }
                            }))
                          }
                        >
                          {worktrees.map((worktree) => (
                            <option key={worktree.id} value={worktree.id}>
                              {worktree.branch} {worktree.writerAgentId ? "(writer busy)" : ""}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    ) : null}
                    {launchTargetMode === "branch-existing" ? (
                      <Field label="Existing branch">
                        <Select
                          value={formState.branchCheckout?.branchName ?? ""}
                          onChange={(event) =>
                            setFormState((current) => ({
                              ...current,
                              target: { kind: "root" },
                              branchCheckout: {
                                mode: "existing",
                                branchName: event.target.value
                              }
                            }))
                          }
                        >
                          {projectBranches.map((branchName) => (
                            <option key={branchName} value={branchName}>
                              {branchName}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    ) : null}
                    {launchTargetMode === "branch-new" ? (
                      <Field label="New branch name">
                        <Input
                          value={formState.branchCheckout?.branchName ?? ""}
                          onChange={(event) =>
                            setFormState((current) => ({
                              ...current,
                              target: { kind: "root" },
                              branchCheckout: {
                                mode: "new",
                                branchName: event.target.value
                              }
                            }))
                          }
                          placeholder="feature/my-branch"
                        />
                      </Field>
                    ) : null}
                    {launchTargetMode === "new" ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Branch prefix">
                          <Select value={branchPrefix} onChange={(event) => setBranchPrefix(event.target.value)}>
                            {WORKTREE_BRANCH_PREFIX_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Branch name">
                          <Input
                            value={branchName}
                            onChange={(event) => setBranchName(event.target.value)}
                            placeholder="add-cool-feature"
                            required
                          />
                        </Field>
                      </div>
                    ) : null}
                    <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
                      <span className="text-muted-foreground">Summary: </span>
                      <span className="font-medium text-foreground">{launchTargetSummary}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {formState.mode === "write"
                          ? "This agent can modify files. Existing worktrees with an active writer cannot take another writer."
                          : "Read-only agents never get write access."}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-border/80 pt-6">
                    <div>
                      <p className="text-sm font-medium text-foreground">Prepare new worktree</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Optional preset run before launch when starting in a fresh worktree.
                      </p>
                    </div>
                    {preparePresetEntries.length ? (
                      <>
                        <Select
                          value={selectedPreparePresetValue}
                          onChange={(event) => handlePreparePresetChange(event.target.value)}
                          disabled={launchTargetMode !== "new"}
                        >
                          <option value="">Do not run a preset</option>
                          {workspacePresetEntries.map((entry) => (
                            <option key={entry.value} value={entry.value}>
                              Workspace: {entry.preset.name.trim() || "Preset"}
                            </option>
                          ))}
                          {globalPresetEntries.map((entry) => (
                            <option key={entry.value} value={entry.value}>
                              Global: {entry.preset.name.trim() || "Preset"}
                            </option>
                          ))}
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {launchTargetMode === "new"
                            ? "Runs only for new worktrees, before the agent starts."
                            : "Choose “New worktree” above to enable a prep preset."}
                        </p>
                        {selectedPreparePreset ? (
                          <div className="rounded-md border border-border bg-muted/20 px-3 py-2.5 font-mono text-xs text-muted-foreground">
                            <span className="font-sans text-[11px] font-medium text-foreground">
                              {selectedPreparePreset.sourceLabel}: {selectedPreparePreset.preset.name.trim() || "Preset"}
                            </span>
                            <div className="mt-1 truncate">{selectedPreparePreset.command}</div>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <p className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                        No terminal presets yet. Add one in workspace or global settings to prep new worktrees.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}

              {currentStepIndex === 2 ? (
                <div className="space-y-6">
                  <dl className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground">Workspace instructions</dt>
                      <dd className="mt-1.5 text-sm leading-snug text-foreground">
                        {project?.workspaceInstructionFile ? (
                          <>
                            {project.workspaceInstructionFile.fileName}
                            <span className="mt-1 block font-mono text-xs text-muted-foreground">
                              {project.workspaceInstructionFile.absolutePath}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">None detected for this workspace.</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground">Global skills (CLI)</dt>
                      <dd className="mt-1.5 text-sm leading-snug text-foreground">
                        {selectedToolSkillCatalog?.supported ? (
                          selectedToolSkillCatalog.skills.length ? (
                            selectedToolSkillCatalog.skills.map((skill) => skill.name).join(", ")
                          ) : (
                            <span className="text-muted-foreground">No visible skills installed for this CLI.</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">Not available for the selected CLI.</span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  <div className="border-t border-border/60 pt-5">
                    <h3 className="text-sm font-medium text-foreground">Shared context</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Optional — attach conversation groups from other Nora agents or matching local CLI sessions for
                      this worktree.
                    </p>
                    <div className="mt-3">
                      <AgentContextPicker
                        surface="flush"
                        sources={contextSources}
                        selections={contextSelections}
                        isLoading={isLoadingContextSources}
                        emptyMessage="No other agents in this workspace have tracked context yet."
                        onChange={setContextSelections}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {currentStepIndex > 0 ? (
            <Button variant="outline" onClick={() => setCurrentStepIndex((current) => Math.max(0, current - 1))}>
              Back
            </Button>
          ) : null}
          {currentStepIndex < CREATE_AGENT_WIZARD_STEPS.length - 1 ? (
            <Button
              onClick={() => setCurrentStepIndex((current) => Math.min(CREATE_AGENT_WIZARD_STEPS.length - 1, current + 1))}
              disabled={(currentStepIndex === 0 && (!detectedTools.length || !formState.toolId)) || (currentStepIndex === 1 && isWorkspaceStepBlocked)}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={() => {
                const branchNameValue = branchName.trim();
                const worktreeBranch =
                  launchTargetMode === "new" && branchNameValue
                    ? { prefix: branchPrefix, name: branchNameValue }
                    : null;
                onCreateAgent(
                  {
                    ...formState,
                    launchSource: "dialog",
                    task: getAgentRolePrompt(selectedRoleId, formState.task),
                    contextSelections,
                    worktreeBranch
                  },
                  selectedTaskPath || null
                );
              }}
              disabled={isLaunchBlocked}
            >
              Launch agent
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
