import { Fragment } from "react";
import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import type { NativeTimelineProps } from "@/components/app/types/nativePanels.types";
import { NativeReview } from "./NativeReview";
import { NativeToolHistory } from "./NativeToolHistory";
import { buildNativeTimeline } from "@/components/app/logic/nativeTimeline";
import { NativeFileChanges } from "./NativeFileChanges";
import { NativeTurnTime } from "./NativeTurnTime";
import type { TimelineItem, ToolActivity } from "@shared/types/conversation/contracts.types";

function renderItem(item: Exclude<TimelineItem, ToolActivity>, onLinkClick: NativeTimelineProps["onLinkClick"]) {
  switch (item.kind) {
    case "message": return <article key={item.id} aria-label={`${item.role} message`}
      className={item.role === "user" ? "ml-auto max-w-[85%] rounded-lg bg-muted px-4 py-3" : "native-prose"}>
        <MarkdownRenderer className="min-w-0 break-words" onLinkClick={onLinkClick}>{item.text}</MarkdownRenderer></article>;
    case "reasoning": return <details key={item.id} className="text-sm text-muted-foreground"><summary>Reasoning</summary><pre className="mt-2 whitespace-pre-wrap">{item.text}</pre></details>;
    case "milestone": return <p key={item.id} className="text-sm text-muted-foreground">{item.text}</p>;
    case "plan": return <ol key={item.id} className="space-y-2 text-sm">{item.steps.map((step, index) => <li key={index}>{step.state} · {step.text}</li>)}</ol>;
    case "changes": return <NativeFileChanges key={item.id} item={item} />;
    case "subagent": return <p key={item.id} className="text-sm">{item.label} · {item.state}</p>;
    case "review": return <NativeReview key={item.id} result={item.result} />;
  }
}

export function NativeTimeline({ items, runs = [], onLinkClick }: NativeTimelineProps) {
  return <div className="space-y-5">{buildNativeTimeline(items, runs).map(({ key, entry, timing }) => <Fragment key={key}>
      {entry.kind === "tools" ? <NativeToolHistory items={entry.items} /> : renderItem(entry.item, onLinkClick)}
      {timing && <NativeTurnTime {...timing} />}
    </Fragment>)}</div>;
}
