import { isAgentBusyAt } from "@/components/app/logic/agentBusy";
import { buildDestroyAgentDescription } from "@/components/app/logic/sessionCloseGuard";
import type { DestroyAgentDialogProps } from "@/components/app/types/component.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { APP_SHORT_NAME } from "@shared/appMeta";
import { AlertTriangle, BotOff, FolderGit2, GitBranch, LoaderCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export function DestroyAgentDialog({
  agent,
  open,
  onOpenChange,
  onConfirm
}: DestroyAgentDialogProps) {
  const [isDestroying, setIsDestroying] = useState(false);
  const [descriptionAt, setDescriptionAt] = useState(() => Date.now());

  useEffect(() => {
    if (!open) {
      setIsDestroying(false);
      return;
    }
    setDescriptionAt(Date.now());
  }, [open]);

  const isBusy = agent ? isAgentBusyAt(agent, descriptionAt) : false;
  const description = agent
    ? buildDestroyAgentDescription(agent, descriptionAt)
    : `This will stop the agent. If no other agents are attached, ${APP_SHORT_NAME} will also remove the worktree.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        headerTitle={
          <span className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-[5px] bg-destructive/10 text-destructive"
              aria-hidden="true"
            >
              <BotOff className="size-4" />
            </span>
            <span className="truncate">Destroy agent</span>
          </span>
        }
      >
        <DialogBody className="space-y-4 pt-6">
          <DialogDescription className="text-[13px] leading-relaxed">{description}</DialogDescription>

          {agent ? (
            <>
              {isBusy ? (
                <div
                  className="flex gap-3 rounded-[5px] border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 text-sm dark:border-amber-400/30 dark:bg-amber-950/45"
                  role="status"
                >
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
                    aria-hidden="true"
                  />
                  <p className="leading-snug text-amber-950 dark:text-amber-100">
                    This session is still running work. Closing it will interrupt the current task.
                  </p>
                </div>
              ) : null}

              <div className="overflow-hidden rounded-[5px] border border-border bg-card shadow-sm">
                <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold tracking-tight text-foreground">{agent.name}</p>
                    {agent.task ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground" title={agent.task}>
                        {agent.task}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant="secondary" className="shrink-0 font-normal">
                    {agent.toolLabel}
                  </Badge>
                </div>
                <dl className="space-y-3 px-4 py-3 text-sm">
                  <div className="flex gap-3">
                    <dt className="flex w-[5.5rem] shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <GitBranch className="size-3.5 opacity-80" aria-hidden="true" />
                      Branch
                    </dt>
                    <dd className="min-w-0 break-all font-mono text-xs text-foreground">{agent.branch}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="flex w-[5.5rem] shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <FolderGit2 className="size-3.5 opacity-80" aria-hidden="true" />
                      Workspace
                    </dt>
                    <dd className="min-w-0 break-all font-mono text-xs leading-relaxed text-foreground">
                      {agent.workspace}
                    </dd>
                  </div>
                </dl>
              </div>
            </>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDestroying}>
            Cancel
          </Button>
          <Button
            className="border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              setIsDestroying(true);
              void onConfirm().finally(() => {
                setIsDestroying(false);
              });
            }}
            disabled={!agent || isDestroying}
          >
            {isDestroying ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="size-4" aria-hidden="true" />
            )}
            Destroy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
