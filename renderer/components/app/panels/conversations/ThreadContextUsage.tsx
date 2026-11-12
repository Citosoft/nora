import { contextCompactionState } from "@/components/app/logic/contextUsage";
import type { ThreadContextUsageProps } from "@/components/app/types/contextUsage.types";
import { useContextMeasurement } from "@/components/app/hooks/useContextMeasurement";
import { ContextUsageWidget } from "./ContextUsageWidget";

/** Shown whenever the selected provider reports context; compaction needs a thread with a native session. */
export function ThreadContextUsage({ header, capabilities, ready, compact, client }: ThreadContextUsageProps) {
  const conversation = header?.conversation ?? null;
  useContextMeasurement(client, conversation, !!capabilities?.contextUsage);
  if (!capabilities?.contextUsage) return null;
  const runs = header ? [...header.activeRuns, ...header.queuedRuns] : [];
  const canCompact = !!capabilities.compaction && !!conversation?.nativeConversationId;
  return <ContextUsageWidget context={conversation?.context} compaction={canCompact && conversation ? {
    state: contextCompactionState(runs, ready && !runs.length),
    onCompact: () => { void compact(); }
  } : null} />;
}
