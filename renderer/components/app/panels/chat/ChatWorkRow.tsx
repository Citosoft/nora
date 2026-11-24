import { useState } from "react";
import { Archive, CircleAlert, CircleCheck, CircleHelp, Clock3, LoaderCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { providerIconPresentation } from "@/components/app/logic/providerIcon";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { ThreadAge } from "@/components/app/panels/threads/ThreadAge";
import type { ChatWorkPhase, ChatWorkRowProps, ChatWorkSettleState } from "@/components/app/types/chatWork.types";

const ACTIVITY_ICONS: Record<ChatWorkPhase, LucideIcon> = {
  pending: Clock3, "in-progress": LoaderCircle, completed: CircleCheck, attention: CircleAlert
};

/** A compact work row; age and settle share a slot so hover never shifts the title or model. */
export function ChatWorkRow({ thread, now, onOpenThread, onSettleThread }: ChatWorkRowProps) {
  const [settlement, setSettlement] = useState<ChatWorkSettleState>({ status: "idle" });
  const providerLabel = providerIconPresentation(thread.providerKind, thread.providerKind, thread.connection).label;
  const Icon = thread.waiting ? CircleHelp : ACTIVITY_ICONS[thread.phase];
  const spinning = thread.phase === "in-progress" && !thread.waiting;
  const color = thread.waiting ? "text-amber-600 dark:text-amber-400"
    : thread.phase === "attention" ? "text-destructive"
      : thread.phase === "completed" ? "text-green-700 dark:text-green-400" : "text-muted-foreground";
  const settling = settlement.status === "settling";
  const settleLabel = settling ? "Settling thread" : thread.canSettle ? `Settle ${thread.title}` : "Stop this thread and clear its queue before settling";
  const settle = async (): Promise<void> => {
    setSettlement({ status: "settling" });
    try { await onSettleThread(thread.id); setSettlement({ status: "idle" }); }
    catch (error: unknown) { setSettlement({ status: "failed", message: error instanceof Error ? error.message : "This thread could not be settled." }); }
  };
  return <div>
    <div className="group/work-row flex items-center rounded-md hover:bg-accent">
      <button type="button" onClick={() => onOpenThread(thread.id)}
        title={[thread.title, providerLabel, thread.model, thread.status, thread.workspaceName].filter(Boolean).join(" · ")}
        aria-label={`Open ${thread.title}, ${providerLabel}, ${thread.model}, ${thread.status}`}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs focus-visible:outline focus-visible:outline-ring">
        <Icon aria-hidden="true" className={`size-3.5 shrink-0 ${color} ${spinning ? "motion-safe:animate-spin" : ""}`} />
        <span className="min-w-0 flex-1 truncate">{thread.title}</span>
        <span className="flex min-w-0 max-w-[40%] items-center gap-1 text-[9px] text-muted-foreground" title={thread.model}>
          <AgentToolIcon connection={thread.connection} toolId={thread.providerKind} label={thread.providerKind} className="size-4 shrink-0" imageClassName="size-3.5" />
          <span className="truncate">{thread.model}</span>
        </span>
      </button>
      <div className="mr-1 grid h-6 min-w-7 shrink-0 place-items-center [&>*]:[grid-area:1/1]">
        <ThreadAge updatedAt={thread.updatedAt} now={now}
          className={!thread.settled ? "transition-opacity group-hover/work-row:opacity-0 group-focus-within/work-row:opacity-0" : undefined} />
        {!thread.settled && <Button type="button" variant="ghost" size="icon" aria-label={settleLabel} tooltip={settleLabel}
          disabled={!thread.canSettle || settling} onClick={() => void settle()}
          className="size-6 opacity-0 transition-opacity group-hover/work-row:opacity-100 group-focus-within/work-row:opacity-100 focus-visible:opacity-100">
          {settling ? <LoaderCircle aria-hidden="true" className="size-3 motion-safe:animate-spin" /> : <Archive aria-hidden="true" className="size-3" />}
        </Button>}
      </div>
    </div>
    {settlement.status === "failed" && <p role="alert" className="px-2 pb-1 text-xs text-destructive">{settlement.message}</p>}
  </div>;
}
