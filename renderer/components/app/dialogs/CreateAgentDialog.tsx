import { AGENT_ROLE_OPTIONS, getAgentRolePrompt } from "@/components/app/logic/agentRoles";
import { createLaunchTargetFormState, launchTargetModeFromTarget, resolveSupportedLaunchTargetMode } from "@/components/app/logic/createAgentLaunchTarget";
import { Field } from "@/components/app/shared/Field";
import type { AgentRoleId, CreateAgentDialogProps, LaunchTargetMode } from "@/components/app/types/component.types";
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
import { Select } from "@/components/ui/select";
import { isAgentToolAvailable } from "@shared/agentToolState";
import { APP_SHORT_NAME } from "@shared/appMeta";
import type {
  CreateAgentPayload,
  TerminalPreset,
  WorktreeTarget
} from "@shared/appTypes";
import { Bot } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const WORKTREE_BRANCH_PREFIX_OPTIONS = [
  { value: "feature", label: "Feature" },
  { value: "bug", label: "Bug" },
  { value: "chore", label: "Chore" },
  { value: "hotfix", label: "Hotfix" },
  { value: "docs", label: "Docs" }
];

function formatPresetCommand(preset: TerminalPreset): string {
  return preset.commands
    .map((command) => command.trim())
    .filter((command) => command.length > 0)
    .join(" && ");
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
  const workspacePresetEntries = workspaceTerminalPresets
    .map((preset) => {
      const command = formatPresetCommand(preset);
      return command ? { preset, command } : null;
    })
    .filter((entry): entry is { preset: TerminalPreset; command: string } => Boolean(entry));
  const globalPresetEntries = globalTerminalPresets
    .map((preset) => {
      const command = formatPresetCommand(preset);
      return command ? { preset, command } : null;
    })
    .filter((entry): entry is { preset: TerminalPreset; command: string } => Boolean(entry));
  const hasPresetEntries = workspacePresetEntries.length > 0 || globalPresetEntries.length > 0;
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
      setFormState({
        toolId: defaults?.toolId ?? detectedTools[0]?.id ?? "",
        name: "",
        task: defaultTask?.title ?? "",
        commandOverride: "",
        mode: defaults?.mode ?? "write",
        ...initialLaunchState,
        target: defaults?.target ? initialTarget : initialLaunchState.target,
        prepareWorktree: initialMode === "new" && !!defaultWorktreePrepareCommand,
        prepareCommand: defaultWorktreePrepareCommand ?? ""
      });
      setSelectedTaskPath(defaultTask?.path ?? "");
      setSelectedRoleId("developer");
      setLaunchTargetMode(initialMode);
      setBranchPrefix(WORKTREE_BRANCH_PREFIX_OPTIONS[0].value);
      setBranchName("");
    }
    wasOpenRef.current = open;
  }, [open, detectedTools, defaults, defaultLaunchTargetMode, defaultWorktreePrepareCommand, availableTasks, worktrees, projectBranches]);

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
      ...createLaunchTargetFormState(nextMode, worktrees, projectBranches, current.prepareWorktree)
    }));
  };

  const dialogHeader = (
    <div className="flex items-center gap-2">
      <Bot className="size-5 text-foreground" aria-hidden />
      <span>New agent session</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(1100px,calc(100vw-2rem))]"
        onClose={() => onOpenChange(false)}
        headerTitle={dialogHeader}
      >
        <DialogHeader>
          <DialogDescription>
            Choose an installed agent CLI, access mode, and either a {APP_SHORT_NAME} worktree target or a regular branch checkout.
          </DialogDescription>
        </DialogHeader>
        
        <DialogBody className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Agent CLI">
                  <Select
                    value={formState.toolId}
                    onChange={(event) => setFormState((current) => ({ ...current, toolId: event.target.value }))}
                  >
                    {detectedTools.map((tool) => (
                        <option key={tool.id} value={tool.id}>
                          {tool.label}
                          {tool.detectedCommand ? (
                            <>
                              {" ("}
                              {tool.detectedCommand}
                              {")"}
                            </>
                          ) : null}
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
              {project?.workspaceInstructionFile ? (
                <div className="rounded-[4px] border border-border/70 bg-background/30 px-4 py-3 text-sm">
                  <div className="font-medium text-foreground">Workspace instructions detected</div>
                  <div className="mt-1 text-muted-foreground">
                    {project.workspaceInstructionFile.fileName} will be available in this workspace at {project.workspaceInstructionFile.absolutePath}.
                  </div>
                </div>
              ) : null}
              {selectedToolSkillCatalog?.supported ? (
                <div className="rounded-[4px] border border-border/70 bg-background/30 px-4 py-3 text-sm">
                  <div className="font-medium text-foreground">Enabled global skills</div>
                  <div className="mt-1 text-muted-foreground">
                    {selectedToolSkillCatalog.skills.length
                      ? selectedToolSkillCatalog.skills.map((skill) => skill.name).join(", ")
                      : "No visible global skills are installed for this CLI."}
                  </div>
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-3">
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
              <Field label="Launch command override">
                <Input
                  value={formState.commandOverride}
                  onChange={(event) => setFormState((current) => ({ ...current, commandOverride: event.target.value }))}
                  placeholder="Leave blank to use the detected CLI"
                />
              </Field>
            </div>
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
                <div className="grid gap-4 md:grid-cols-2">
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
              <div className="rounded-[4px] border border-border/70 bg-background/30 px-4 py-3">
                <label className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    className="size-4 rounded-[4px] border border-input bg-background"
                    checked={!!formState.prepareWorktree}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        prepareWorktree: event.target.checked
                      }))
                    }
                  />
                  Prepare new worktree before launching
                </label>
                <div className="mt-2 text-xs text-muted-foreground">
                  Runs only when launch target is a fresh worktree.
                </div>
                <div className="mt-3">
                  <Input
                    value={formState.prepareCommand ?? ""}
                    onChange={(event) => setFormState((current) => ({ ...current, prepareCommand: event.target.value }))}
                    placeholder="pnpm install"
                    disabled={!formState.prepareWorktree || launchTargetMode !== "new"}
                  />
                </div>
                {hasPresetEntries ? (
                  <div
                    className={`mt-3 grid w-full gap-3 ${
                      workspacePresetEntries.length && globalPresetEntries.length ? "md:grid-cols-2" : "md:grid-cols-1"
                    }`}>
                    {workspacePresetEntries.length ? (
                      <div className="rounded-[4px] border border-border/60 bg-background/30 p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                          Workspace presets
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          {workspacePresetEntries.map((entry) => (
                          <div
                            key={entry.preset.id}
                            className="flex w-full items-start justify-between gap-3 rounded-[4px] border border-border/60 bg-card/40 px-3 py-2"
                          >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground">
                                  {entry.preset.name.trim() || "Preset"}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">{entry.command}</div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setFormState((current) => ({
                                    ...current,
                                    prepareWorktree: true,
                                    prepareCommand: entry.command
                                  }))
                                }
                              >
                                Use
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {globalPresetEntries.length ? (
                      <div className="rounded-[4px] border border-border/60 bg-background/30 p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                          Global presets
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          {globalPresetEntries.map((entry) => (
                          <div
                            key={entry.preset.id}
                            className="flex w-full items-start justify-between gap-3 rounded-[4px] border border-border/60 bg-card/40 px-3 py-2"
                          >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground">
                                  {entry.preset.name.trim() || "Preset"}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">{entry.command}</div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setFormState((current) => ({
                                    ...current,
                                    prepareWorktree: true,
                                    prepareCommand: entry.command
                                  }))
                                }
                              >
                                Use
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
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
                  task: getAgentRolePrompt(selectedRoleId, formState.task),
                  worktreeBranch
                },
                selectedTaskPath || null
              );
            }}
            disabled={
              !detectedTools.length ||
              !formState.toolId ||
              (
                formState.target.kind === "existing" &&
                formState.mode === "write" &&
                !!selectedExistingWorktree?.writerAgentId
              ) ||
              (launchTargetMode === "existing" && formState.target.kind === "existing" && !formState.target.worktreeId) ||
              (launchTargetMode === "branch-existing" && !projectBranches.length) ||
              ((launchTargetMode === "branch-existing" || launchTargetMode === "branch-new") &&
                !formState.branchCheckout?.branchName.trim()) ||
              (launchTargetMode === "new" && !branchName.trim())
            }
          >
            Launch agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
