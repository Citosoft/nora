import { Users } from "lucide-react";
import type { ThreadSubagentsProps } from "@/components/app/types/threadSubagents.types";
import { ThreadSubagentRow } from "./ThreadSubagentRow";

/** Agents the thread delegated work to, running ones first. */
export function ThreadSubagents({ summary }: ThreadSubagentsProps) {
  const finished = summary.agents.length - summary.running;
  return <div className="space-y-2 border-t border-border/50 pt-3">
    <div className="flex items-center gap-1.5 font-medium"><Users className="size-3.5" aria-hidden="true" />Subagents
      <span className="ml-auto font-normal tabular-nums text-muted-foreground" aria-live="polite">
        {[summary.running ? `${summary.running} running` : "", finished ? `${finished} finished` : ""].filter(Boolean).join(" · ")}
      </span>
    </div>
    <ul className="space-y-0.5" aria-label="Thread subagents">{summary.agents.map((agent) => <ThreadSubagentRow key={agent.nativeId} agent={agent} />)}</ul>
  </div>;
}
