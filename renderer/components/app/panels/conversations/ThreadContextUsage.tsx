import { contextCompactionState } from "@/components/app/logic/contextUsage";
import type { ThreadContextUsageProps } from "@/components/app/types/contextUsage.types";
import { useContextMeasurement } from "@/components/app/hooks/useContextMeasurement";
import { ContextUsageWidget } from "./ContextUsageWidget";
import { useContextCompactionAdvice } from "@/components/app/hooks/useContextCompactionAdvice";
import { useThreadCenterPorts } from "@/components/app/hooks/useThreadCenterPorts";
import { Button } from "@/components/ui/button";
import { Shrink } from "lucide-react";

/** Shown whenever the selected provider reports context; compaction needs a thread with a native session. */
export function ThreadContextUsage({ header, capabilities, ready, compact, client }: ThreadContextUsageProps) {
  const conversation = header?.conversation ?? null;
  const { state } = useThreadCenterPorts();
  const advice = useContextCompactionAdvice(conversation?.context, (state.boot.personalization.idleCompaction ?? "suggest") !== "off");
  useContextMeasurement(client, conversation, !!capabilities?.contextUsage);
  if (!capabilities?.contextUsage) return null;
  const runs = header ? [...header.activeRuns, ...header.queuedRuns] : [];
  const canCompact = !!capabilities.compaction && !!conversation?.nativeConversationId;
  const idle = ready && !runs.length;
  return <>
    {canCompact && idle && advice === "expired" && <Button type="button" size="sm" variant="outline"
      title="This large thread's prompt cache may have expired. Compact earlier messages to reduce context."
      onClick={() => { void compact(); }}><Shrink className="size-3.5" aria-hidden="true" />Compact context</Button>}
    <ContextUsageWidget context={conversation?.context} compaction={canCompact && conversation ? {
    state: contextCompactionState(runs, ready && !runs.length),
    onCompact: () => { void compact(); }
  } : null} />
  </>;
}
