import { Bot, Check, ChevronRight, CircleHelp, LoaderCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toolStateLabel } from "@/components/app/logic/toolStateLabel";
import type { ThreadSubagentRowProps } from "@/components/app/types/threadSubagents.types";
import { NativeToolActivity } from "./NativeToolActivity";
import { ThreadSubagentDetail } from "./ThreadSubagentDetail";

/** One agent: its status at a glance, expanding to its task, latest progress, result and the tools it ran. */
export function ThreadSubagentRow({ agent }: ThreadSubagentRowProps) {
  const running = agent.state === "running";
  const failed = agent.state === "failed";
  const Icon = running ? LoaderCircle : agent.state === "completed" ? Check : agent.state === "unconfirmed" ? CircleHelp : X;
  const status = toolStateLabel(agent.state);
  const latest = running ? agent.progress : agent.result ?? agent.progress;
  const identity = [agent.agentType !== agent.label ? agent.agentType : undefined, agent.model, agent.effort && `${agent.effort} effort`].filter(Boolean).join(" · ");
  return <li>
    <details className="group/subagent rounded-md" aria-label={`${agent.label}: ${status}`}>
      <summary className="flex cursor-pointer list-none items-start gap-2 rounded-md py-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className={cn("mt-0.5 shrink-0 text-muted-foreground", running && "text-primary motion-safe:animate-spin", failed && "text-destructive")} aria-hidden="true"><Icon className="size-3.5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate" title={agent.label}>{agent.label}</span>
          {latest && <span className="block truncate text-[10px] text-muted-foreground" title={latest}>{latest.replace(/\s+/g, " ")}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span role="status" className={cn("text-[10px] text-muted-foreground", failed && "text-destructive")}>{status}</span>
          {agent.model && <span className="max-w-20 truncate text-[10px] text-muted-foreground/80" title={`Model: ${agent.model}`}>{agent.model}</span>}
        </span>
        <ChevronRight className="mt-0.5 size-3 shrink-0 text-muted-foreground transition-transform group-open/subagent:rotate-90" aria-hidden="true" />
      </summary>
      <div className="space-y-2.5 pb-2 pl-5 pt-1.5">
        {identity && <p className="flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground"><Bot className="size-3 shrink-0" aria-hidden="true" /><span className="truncate" title={identity}>{identity}</span></p>}
        {running && agent.progress && <ThreadSubagentDetail title="Now">{agent.progress}</ThreadSubagentDetail>}
        {agent.prompt && <ThreadSubagentDetail title="Task">{agent.prompt}</ThreadSubagentDetail>}
        {agent.result && <ThreadSubagentDetail title="Result">{agent.result}</ThreadSubagentDetail>}
        <div>
          <p className="mb-1 text-[10px] font-medium text-muted-foreground">Activity{agent.activity.length > 0 && <span className="ml-1 tabular-nums">{agent.activity.length}</span>}</p>
          {agent.activity.length
            ? <div className="space-y-0.5" aria-label={`${agent.label} tool calls`}>{agent.activity.map((item) => <NativeToolActivity key={item.id} item={item} />)}</div>
            : <p className="text-[10px] text-muted-foreground">{running ? "No tool calls yet." : "No tool calls were reported."}</p>}
        </div>
      </div>
    </details>
  </li>;
}
