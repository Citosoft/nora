import { memo } from "react";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { toolStateLabel } from "@/components/app/logic/toolStateLabel";
import { NativeMessage } from "./NativeMessage";
import type { NativeTimelineProps } from "@/components/app/types/nativePanels.types";
import { NativeReview } from "./NativeReview";
import { NativeToolHistory } from "./NativeToolHistory";
import { buildNativeTimeline } from "@/components/app/logic/nativeTimeline";
import { NativeFileChanges } from "./NativeFileChanges";
import { NativeTurnTime } from "./NativeTurnTime";
import { NativeReasoning } from "./NativeReasoning";
import { NativeTurnStatus } from "./NativeTurnStatus";
import { ConnectorSignInCard } from "./ConnectorSignInCard";
import { NativeAskBotCard } from "./NativeAskBotCard";
import { NativeMemoryLine } from "./NativeMemoryLine";
import { McpAppEntry } from "./mcp-app/McpAppEntry";
import { ToolImageEntry } from "./ToolImageEntry";
import type { NativeTimelineEntry } from "@/components/app/types/nativeActivity.types";

const NO_RUNS: NonNullable<NativeTimelineProps["runs"]> = [];

function renderItem(item: Extract<NativeTimelineEntry, { kind: "item" }>["item"], continued: boolean, { onLinkClick, connectors = null, mentions, pins, turnUndo }: Pick<NativeTimelineProps, "onLinkClick" | "connectors" | "mentions" | "pins" | "turnUndo">) {
  switch (item.kind) {
    case "message": return <NativeMessage key={item.id} item={item} onLinkClick={onLinkClick} pins={pins} mentions={mentions} actions={continued ? "overlay" : "inline"} />;
    case "milestone": return <p key={item.id} className="text-sm text-muted-foreground">{item.text}</p>;
    case "plan": return <ol key={item.id} className="space-y-2 text-sm">{item.steps.map((step, index) => <li key={index}>{step.state} · {step.text}</li>)}</ol>;
    case "changes": return <NativeFileChanges key={item.id} item={item} />;
    case "subagent": return <p key={item.id} className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <Users className="size-3.5 shrink-0" aria-hidden="true" /><span className={cn("truncate", item.state === "running" && "text-shimmer")}>{item.label}</span><span className="shrink-0 text-xs">· {toolStateLabel(item.state)}</span></p>;
    case "review": return <NativeReview key={item.id} item={item} undo={turnUndo} />;
    case "connector-sign-in": return <ConnectorSignInCard key={item.id} item={item} connectors={connectors} />;
  }
}

export const NativeTimeline = memo(function NativeTimeline({ items, runs = NO_RUNS, onLinkClick, connectors, mentions, resolveBot, onOpenThread, mcpApps, toolOutputs, onOpenOutput, pins, turnUndo }: NativeTimelineProps) {
  const rows = buildNativeTimeline(items, runs);
  // Rows sit 20px apart, except an agent message that runs straight on from the previous one in its turn.
  return <div>{rows.map(({ key, entry, timing, activity, continued }, index) => <div key={key} className={cn("space-y-5", index > 0 && (rows[index - 1].continued ? "mt-2" : "mt-5"))}>
      {entry.kind === "tools" ? <NativeToolHistory items={entry.items} servers={connectors?.summary.status === "ready" ? connectors.summary.servers : undefined} />
        : entry.kind === "reasoning" ? <NativeReasoning items={entry.items} />
        : entry.kind === "ask" ? <NativeAskBotCard call={entry.call} bot={resolveBot?.(entry.call.bot) ?? null} onOpenThread={onOpenThread} onLinkClick={onLinkClick} mentions={mentions} />
        : entry.kind === "memory" ? <NativeMemoryLine call={entry.call} />
        : entry.kind === "app" ? mcpApps && <McpAppEntry call={entry.call} host={mcpApps} />
        : entry.kind === "images" ? toolOutputs && <ToolImageEntry tool={entry.tool} paths={entry.paths} host={toolOutputs} onOpen={onOpenOutput} />
        : renderItem(entry.item, continued, { onLinkClick, connectors, mentions, pins, turnUndo })}
      {activity && <NativeTurnStatus activity={activity} />}
      {timing && <NativeTurnTime {...timing} />}
    </div>)}</div>;
});
