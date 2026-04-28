import { Field } from "@/components/app/shared/Field";
import type { GenerateTasksDialogProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isAgentToolAvailable } from "@shared/agentToolState";
import { useEffect, useMemo, useState } from "react";

export function GenerateTasksDialog({
  open,
  workspaces,
  tools,
  defaultWorkspaceId,
  defaultToolId,
  defaultSpecPath = null,
  onOpenChange,
  onSubmit
}: GenerateTasksDialogProps) {
  const detectedTools = useMemo(() => tools.filter((tool) => isAgentToolAvailable(tool)), [tools]);
  const [projectId, setProjectId] = useState("");
  const [toolId, setToolId] = useState("");
  const [brief, setBrief] = useState("");
  const [selectedSpecPath, setSelectedSpecPath] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setProjectId(defaultWorkspaceId || workspaces[0]?.projectId || "");
    setToolId(defaultToolId || detectedTools[0]?.id || "");
    setBrief("");
    setSelectedSpecPath(defaultSpecPath || "");
    setIsSubmitting(false);
  }, [defaultSpecPath, open, defaultToolId, defaultWorkspaceId, detectedTools, workspaces]);

  const selectedWorkspace = workspaces.find((workspace) => workspace.projectId === projectId) || null;
  const canSubmit = !!projectId && !!toolId && (!!brief.trim() || !!selectedSpecPath) && !isSubmitting;

  useEffect(() => {
    if (!selectedWorkspace) {
      if (selectedSpecPath) {
        setSelectedSpecPath("");
      }
      return;
    }

    const hasSelectedSpec = selectedWorkspace.specs.some((spec) => spec.path === selectedSpecPath);
    if (!hasSelectedSpec && selectedSpecPath) {
      setSelectedSpecPath("");
    }
  }, [selectedSpecPath, selectedWorkspace]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} headerTitle="Generate tasks">
        <DialogHeader>
          <DialogDescription>
            Launch an agent to plan the work, then write task files into `.nora/tasks/` for the selected workspace.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Field label="Workspace">
            <Select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              {workspaces.map((workspace) => (
                <option key={workspace.projectId} value={workspace.projectId}>
                  {workspace.projectName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Agent CLI">
            <Select value={toolId} onChange={(event) => setToolId(event.target.value)} disabled={!detectedTools.length}>
              {detectedTools.map((tool) => (
                <option key={tool.id} value={tool.id}>
                  {tool.label}
                </option>
              ))}
            </Select>
          </Field>
          {selectedWorkspace ? (
            <div className="rounded-[4px] border border-border/70 bg-background/30 px-4 py-3 text-sm text-muted-foreground">
              Task files will be created in `{selectedWorkspace.projectRootPath}/.nora/tasks/`.
            </div>
          ) : null}
          <Field label="Spec">
            <Select value={selectedSpecPath} onChange={(event) => setSelectedSpecPath(event.target.value)}>
              <option value="">No spec</option>
              {(selectedWorkspace?.specs ?? []).map((spec) => (
                <option key={spec.path} value={spec.path}>
                  {spec.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Planning brief">
            <Textarea
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              placeholder={selectedSpecPath ? "Optional extra instructions for the selected spec." : "Describe what needs to be broken down into actionable tasks."}
              className="min-h-32"
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!canSubmit) {
                return;
              }
              setIsSubmitting(true);
              void onSubmit({
                projectId,
                toolId,
                brief: brief.trim() || null,
                specPath: selectedSpecPath || null
              }).finally(() => {
                setIsSubmitting(false);
              });
            }}
            disabled={!canSubmit}
          >
            Generate tasks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
