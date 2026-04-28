import {
  getStoredTerminalShellIds,
  rememberTerminalShell,
  resolvePreferredTerminalShellId
} from "@/components/app/logic/terminalShellPreferences";
import { Field } from "@/components/app/shared/Field";
import type { CreateTerminalDialogProps } from "@/components/app/types/component.types";
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
import type {
  CreateTerminalPayload
} from "@shared/appTypes";
import { useEffect, useMemo, useRef, useState } from "react";

export function CreateTerminalDialog({
  open,
  project,
  worktrees,
  terminalShells,
  activeBranch,
  defaults,
  onOpenChange,
  onCreateTerminal
}: CreateTerminalDialogProps) {
  const wasOpenRef = useRef(false);
  const existingWorktrees = useMemo(
    () =>
      worktrees.filter((worktree) => worktree.path !== project?.rootPath && worktree.createdFromRef !== "ROOT"),
    [project?.rootPath, worktrees]
  );
  const rootWorktree = useMemo(
    () => worktrees.find((worktree) => worktree.path === project?.rootPath) ?? null,
    [project?.rootPath, worktrees]
  );
  const rootBranchLabel = activeBranch || rootWorktree?.branch || project?.baseBranch || "";
  const [formState, setFormState] = useState<CreateTerminalPayload>({
    name: "Terminal",
    shellId: "",
    target: { kind: "root" },
    launchConfig: {
      kind: "blank",
      label: "Shell",
      command: ""
    }
  });

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const preferredShellId =
        defaults?.shellId ||
        resolvePreferredTerminalShellId(terminalShells) ||
        getStoredTerminalShellIds().lastShellId ||
        terminalShells[0]?.id ||
        "";
      const defaultTarget = defaults?.target || { kind: "root" as const };

      setFormState({
        name: defaults?.name || "Terminal",
        shellId: preferredShellId,
        target: defaultTarget,
        launchConfig: defaults?.launchConfig || {
          kind: "blank",
          label: "Shell",
          command: ""
        }
      });
    }
    wasOpenRef.current = open;
  }, [defaults, existingWorktrees, open, terminalShells]);

  const dialogTitle = formState.launchConfig.kind === "script" ? "Run script in terminal" : "Open terminal";
  const dialogDescription =
    formState.launchConfig.kind === "script"
      ? "Choose the shell and target checkout for this script."
      : "Choose the shell and target checkout for this terminal.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} headerTitle={dialogTitle}>
        <DialogHeader>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Field label="Terminal name">
            <Input
              value={formState.name}
              onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
              placeholder="Terminal"
            />
          </Field>
          <Field label="Shell">
            <Select
              value={formState.shellId || ""}
              onChange={(event) => setFormState((current) => ({ ...current, shellId: event.target.value }))}
            >
              {terminalShells.map((shell) => (
                <option key={shell.id} value={shell.id}>
                  {shell.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Attach to">
            <Select
              value={
                formState.target.kind === "existing"
                  ? `existing:${formState.target.worktreeId}`
                  : formState.target.kind
              }
              onChange={(event) => {
                const value = event.target.value;
                setFormState((current) => ({
                  ...current,
                  target:
                    value === "root"
                      ? { kind: "root" }
                      : { kind: "existing", worktreeId: value.replace(/^existing:/, "") }
                }));
              }}
            >
              <option value="root">
                Repo root {project ? `(${rootBranchLabel})` : ""}
              </option>
              {existingWorktrees.map((worktree) => (
                <option key={worktree.id} value={`existing:${worktree.id}`}>
                  Worktree: {worktree.branch}
                </option>
              ))}
            </Select>
          </Field>
          <div className="rounded-[4px] border border-border/70 bg-background/30 px-4 py-3 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">{formState.launchConfig.label}</div>
            {formState.launchConfig.command ? (
              <div className="mt-1 font-mono text-xs">{formState.launchConfig.command}</div>
            ) : (
              <div className="mt-1 text-xs">Interactive shell session</div>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (formState.shellId) {
                rememberTerminalShell(formState.shellId);
              }
              onCreateTerminal(formState);
            }}
            disabled={!formState.shellId}
          >
            Launch terminal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
