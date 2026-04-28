import { Field } from "@/components/app/shared/Field";
import type { CreatePullRequestDialogProps } from "@/components/app/types/component.types";
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
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useRef, useState } from "react";

export function CreatePullRequestDialog({
  open,
  provider,
  sourceBranch,
  baseBranch,
  availableBaseBranches,
  onOpenChange,
  onCreate
}: CreatePullRequestDialogProps) {
  const wasOpenRef = useRef(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedBaseBranch, setSelectedBaseBranch] = useState(baseBranch);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setTitle("");
      setBody("");
      setSelectedBaseBranch(baseBranch);
      setErrorMessage(null);
    }
    wasOpenRef.current = open;
  }, [open, baseBranch]);

  const pullRequestLabel = provider === "gitlab" ? "merge request" : "pull request";
  const submitLabel = provider === "gitlab" ? `Create MR ${sourceBranch} -> ${selectedBaseBranch}` : `Create PR ${sourceBranch} -> ${selectedBaseBranch}`;
  const canSubmit = title.trim().length > 0 && sourceBranch.trim().length > 0 && selectedBaseBranch.trim().length > 0 && sourceBranch !== selectedBaseBranch;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} headerTitle={provider === "gitlab" ? "New merge request" : "New pull request"}>
        <DialogHeader>
          <DialogTitle>{provider === "gitlab" ? "Create merge request" : "Create pull request"}</DialogTitle>
          <DialogDescription>
            Create a {pullRequestLabel} from the active branch in the currently focused worktree.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Field label="Source branch">
            <Input value={sourceBranch} readOnly />
          </Field>
          <Field label="Base branch">
            <Select value={selectedBaseBranch} onChange={(event) => setSelectedBaseBranch(event.target.value)}>
              {availableBaseBranches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Title">
            <Input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setErrorMessage(null);
              }}
              placeholder={provider === "gitlab" ? "Fix build regression" : "Fix build regression"}
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                setErrorMessage(null);
              }}
              placeholder="Describe the change, testing, and any review context."
              className="min-h-40 resize-y"
            />
          </Field>
          {errorMessage ? (
            <div className="rounded-[6px] border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-foreground">
              {errorMessage}
            </div>
          ) : null}
          {sourceBranch && selectedBaseBranch && sourceBranch === selectedBaseBranch ? (
            <div className="rounded-[6px] border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
              Choose a different base branch. The source and base branch cannot be the same.
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!canSubmit || isSubmitting) {
                return;
              }
              setErrorMessage(null);
              setIsSubmitting(true);
              void onCreate({
                title: title.trim(),
                body: body.trim(),
                baseBranch: selectedBaseBranch.trim()
              }).catch((error: unknown) => {
                setErrorMessage(error instanceof Error ? error.message : "Unable to create pull request.");
              }).finally(() => {
                setIsSubmitting(false);
              });
            }}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? "Working" : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
