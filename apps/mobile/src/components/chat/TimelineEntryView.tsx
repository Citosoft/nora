import { memo } from "react";
import type { TimelineEntry } from "@/types/conversationState.types";
import { ChangesItem, ConnectorSignInItem, MilestoneItem, PlanItem, ReasoningItem, ReviewItem } from "./CompactItems";
import { MessageItem } from "./MessageItem";
import { SubagentItem } from "./SubagentItem";
import { ToolCard } from "./ToolCard";

export const TimelineEntryView = memo(function TimelineEntryView({ entry }: { entry: TimelineEntry }) {
  if (entry.kind === "subagent") return <SubagentItem item={entry.item} children={entry.children} />;
  const item = entry.item;
  switch (item.kind) {
    case "message": return <MessageItem item={item} />;
    case "reasoning": return <ReasoningItem item={item} />;
    case "tool": return <ToolCard item={item} />;
    case "milestone": return <MilestoneItem item={item} />;
    case "plan": return <PlanItem item={item} />;
    case "changes": return <ChangesItem item={item} />;
    case "review": return <ReviewItem item={item} />;
    case "connector-sign-in": return <ConnectorSignInItem item={item} />;
  }
});
