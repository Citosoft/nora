import { Fragment } from "react";
import { Users } from "lucide-react";
import { toolStateLabel } from "@/components/app/logic/toolStateLabel";
import { NativeMessage } from "./NativeMessage";
import type { NativeTimelineProps } from "@/components/app/types/nativePanels.types";
import { NativeReview } from "./NativeReview";
import { NativeToolHistory } from "./NativeToolHistory";
import { buildNativeTimeline } from "@/components/app/logic/nativeTimeline";
import { NativeFileChanges } from "./NativeFileChanges";
import { NativeTurnTime } from "./NativeTurnTime";
import { NativeReasoning } from "./NativeReasoning";
import { ConnectorSignInCard } from "./ConnectorSignInCard";
import type { NativeTimelineEntry } from "@/components/app/types/nativeActivity.types";

function renderItem(item: Extract<NativeTimelineEntry, { kind: "item" }>["item"], { onLinkClick, connectors = null }: Pick<NativeTimelineProps, "onLinkClick" | "connectors">) {
  switch (item.kind) {
    case "message": return <NativeMessage key={item.id} item={item} onLinkClick={onLinkClick} />;
    case "milestone": return <p key={item.id} className="text-sm text-muted-foreground">{item.text}</p>;
    case "plan": return <ol key={item.id} className="space-y-2 text-sm">{item.steps.map((step, index) => <li key={index}>{step.state} · {step.text}</li>)}</ol>;
    case "changes": return <NativeFileChanges key={item.id} item={item} />;
    case "subagent": return <p key={item.id} className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <Users className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{item.label}</span><span className="shrink-0 text-xs">· {toolStateLabel(item.state)}</span></p>;
    case "review": return <NativeReview key={item.id} result={item.result} />;
    case "connector-sign-in": return <ConnectorSignInCard key={item.id} item={item} connectors={connectors} />;
  }
}

export function NativeTimeline({ items, runs = [], onLinkClick, connectors }: NativeTimelineProps) {
  return <div className="space-y-5">{buildNativeTimeline(items, runs).map(({ key, entry, timing }) => <Fragment key={key}>
      {entry.kind === "tools" ? <NativeToolHistory items={entry.items} />
        : entry.kind === "reasoning" ? <NativeReasoning items={entry.items} />
        : renderItem(entry.item, { onLinkClick, connectors })}
      {timing && <NativeTurnTime {...timing} />}
    </Fragment>)}</div>;
}
