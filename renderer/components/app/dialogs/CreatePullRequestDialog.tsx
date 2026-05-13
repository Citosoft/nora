import { Field } from "@/components/app/shared/Field";
import type { CreatePullRequestDialogProps } from "@/components/app/types/component.types";
import { ForgeProviderIcon } from "@/components/app/views/ForgeProviderIcon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, FileText, GitBranch, GitPullRequest, MessageSquare, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const BRANCH_PREFIXES = ["feature", "feat", "fix", "bugfix", "chore", "docs", "refactor", "hotfix", "release"];

function toSuggestedPullRequestTitle(sourceBranch: string, baseBranch: string): string {
  const segments = sourceBranch
    .trim()
    .split("/")
    .filter(Boolean);
  const candidate = segments.at(-1) ?? sourceBranch.trim();
  const withoutTicketPrefix = candidate.replace(/^[A-Z]+-\d+[-_/]*/g, "");
  const normalized = withoutTicketPrefix
    .split(/[-_]+/)
    .filter((segment) => segment.length > 0 && !BRANCH_PREFIXES.includes(segment.toLowerCase()));
  const words = normalized.length > 0 ? normalized : [candidate];
  const title = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .trim();

  if (!title) {
    return "";
  }

  return baseBranch.trim() ? `${title} into ${baseBranch.trim()}` : title;
}

export function CreatePullRequestDialog({
  open,
  provider,
  sourceBranch,
  baseBranch,
  availableBranches,
  onOpenChange,
  onCreate
}: CreatePullRequestDialogProps) {
  const resolvedProvider = provider === "gitlab" ? "gitlab" : "github";
  const wasOpenRef = useRef(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedSourceBranch, setSelectedSourceBranch] = useState(sourceBranch);
  const [selectedBaseBranch, setSelectedBaseBranch] = useState(baseBranch);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastAutoTitleRef = useRef("");
  const hasEditedTitleRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setTitle("");
      setBody("");
      setSelectedSourceBranch(sourceBranch);
      setSelectedBaseBranch(baseBranch);
      setErrorMessage(null);
      lastAutoTitleRef.current = "";
      hasEditedTitleRef.current = false;
    }
    wasOpenRef.current = open;
  }, [open, sourceBranch, baseBranch]);

  const suggestedTitle = toSuggestedPullRequestTitle(selectedSourceBranch, selectedBaseBranch);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!hasEditedTitleRef.current || title.trim().length === 0 || title === lastAutoTitleRef.current) {
      setTitle(suggestedTitle);
      lastAutoTitleRef.current = suggestedTitle;
      hasEditedTitleRef.current = false;
    }
  }, [open, suggestedTitle, title]);

  const submitLabel = resolvedProvider === "gitlab"
    ? `Create MR ${selectedSourceBranch} -> ${selectedBaseBranch}`
    : `Create PR ${selectedSourceBranch} -> ${selectedBaseBranch}`;
  const canSubmit =
    title.trim().length > 0 &&
    selectedSourceBranch.trim().length > 0 &&
    selectedBaseBranch.trim().length > 0 &&
    selectedSourceBranch !== selectedBaseBranch;
  const providerLabel = resolvedProvider === "gitlab" ? "GitLab" : "GitHub";
  const branchWarning = selectedSourceBranch && selectedBaseBranch && selectedSourceBranch === selectedBaseBranch
    ? "Choose a different base branch. The source and base branch cannot be the same."
    : null;
  const routingCardClassName = "rounded-[8px] border border-border/70 bg-muted/30 p-4";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        headerTitle={
          <span className="inline-flex items-center gap-2">
            <ForgeProviderIcon provider={resolvedProvider} className="size-4 shrink-0" />
            <GitPullRequest className="size-4 shrink-0 text-muted-foreground" />
            <span>{resolvedProvider === "gitlab" ? "New merge request" : "New pull request"}</span>
          </span>
        }
      >
        <DialogBody className="space-y-5">
          {errorMessage ? (
            <div className="rounded-[6px] border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-foreground">
              {errorMessage}
            </div>
          ) : null}
          {branchWarning ? (
            <div className="rounded-[6px] border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
              {branchWarning}
            </div>
          ) : null}
          <div className={routingCardClassName}>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <GitBranch className="size-3.5 shrink-0" />
              <span>{providerLabel} branch routing</span>
            </div>
            <div className="grid gap-x-3 gap-y-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:grid-rows-[auto_auto]">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Source</span>
              <div className="hidden md:block" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Base</span>
              <div className="relative">
                <GitBranch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
                <Select
                  value={selectedSourceBranch}
                  onChange={(event) => setSelectedSourceBranch(event.target.value)}
                  className="pl-9"
                >
                  {availableBranches.map((branch) => (
                    <option key={`source-${branch}`} value={branch}>
                      {branch}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex h-10 items-center justify-center self-end text-muted-foreground">
                <ArrowRight className="size-4" />
              </div>
              <div className="relative">
                <GitBranch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Select
                  value={selectedBaseBranch}
                  onChange={(event) => setSelectedBaseBranch(event.target.value)}
                  className="pl-9"
                >
                  {availableBranches.map((branch) => (
                    <option key={`base-${branch}`} value={branch}>
                      {branch}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
          <Field label="Title">
            <div className="relative">
              <FileText className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  hasEditedTitleRef.current = true;
                  setErrorMessage(null);
                }}
                placeholder="Fix build regression into main"
                className="pl-9"
              />
            </div>
          </Field>
          <Field label="Description">
            <div className="rounded-[8px] border border-border/70 bg-background/70">
              <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <MessageSquare className="size-3.5" />
                Review context
              </div>
              <Textarea
                value={body}
                onChange={(event) => {
                  setBody(event.target.value);
                  setErrorMessage(null);
                }}
                placeholder="Describe the change, testing, risks, and anything reviewers should focus on."
                className="min-h-40 resize-y border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            className="min-w-[13rem] justify-center"
            onClick={() => {
              if (!canSubmit || isSubmitting) {
                return;
              }
              setErrorMessage(null);
              setIsSubmitting(true);
              void onCreate({
                title: title.trim(),
                body: body.trim(),
                sourceBranch: selectedSourceBranch.trim(),
                baseBranch: selectedBaseBranch.trim()
              }).catch((error: unknown) => {
                setErrorMessage(error instanceof Error ? error.message : "Unable to create pull request.");
              }).finally(() => {
                setIsSubmitting(false);
              });
            }}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? null : <Sparkles className="size-4" />}
            {isSubmitting ? "Working" : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
