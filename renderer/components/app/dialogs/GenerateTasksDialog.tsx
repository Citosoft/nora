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
import { useEffect, useState } from "react";

export function GenerateTasksDialog({
  open,
  workspaces,
  defaultWorkspaceId,
  defaultSpecPath = null,
  onOpenChange,
  onSubmit
}: GenerateTasksDialogProps) {
  const [projectId, setProjectId] = useState("");
  const [brief, setBrief] = useState("");
  const [selectedSpecPath, setSelectedSpecPath] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialProjectId = defaultWorkspaceId || workspaces[0]?.projectId || "";

  useEffect(() => {
    if (!open) {
      return;
    }

    setProjectId(initialProjectId);
    setBrief("");
    setSelectedSpecPath(defaultSpecPath || "");
    setIsSubmitting(false);
    setError(null);
  }, [defaultSpecPath, open, initialProjectId]);

  const selectedWorkspace = workspaces.find((workspace) => workspace.projectId === projectId) || null;
  const canSubmit = !!selectedWorkspace && (!!brief.trim() || !!selectedSpecPath) && !isSubmitting;

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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) onOpenChange(next);
      }}
    >
      <DialogContent
        onClose={() => {
          if (!isSubmitting) onOpenChange(false);
        }}
        headerTitle="Generate tasks"
      >
        <DialogHeader>
          <DialogDescription>
            Start a planning thread from a brief or spec. Review the plan and follow its progress in your workspace.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Field label="Project">
            <Select
              aria-label="Project"
              disabled={isSubmitting}
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
            >
              {workspaces.map((workspace) => (
                <option key={workspace.projectId} value={workspace.projectId}>
                  {workspace.projectName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Spec">
            <Select
              aria-label="Spec"
              disabled={isSubmitting}
              value={selectedSpecPath}
              onChange={(event) => setSelectedSpecPath(event.target.value)}
            >
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
              aria-label="Planning brief"
              disabled={isSubmitting}
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              placeholder={
                selectedSpecPath
                  ? "Optional extra instructions for the selected spec."
                  : "Describe what needs to be broken down into actionable tasks."
              }
              className="min-h-32"
            />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
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
              setError(null);
              void onSubmit({
                projectId,
                brief: brief.trim() || null,
                specPath: selectedSpecPath || null
              })
                .catch((cause: unknown) => {
                  setError(cause instanceof Error ? cause.message : "Unable to start the planning thread.");
                })
                .finally(() => {
                  setIsSubmitting(false);
                });
            }}
            disabled={!canSubmit}
          >
            {isSubmitting ? "Starting thread…" : "Start planning thread"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
