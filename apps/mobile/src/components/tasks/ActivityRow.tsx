import { memo } from "react";
import type { ActivityEntry, ExecutionStateKind } from "@/types/conversationState.types";
import type { IconName } from "@/types/icon.types";
import { executionStateOf, runStateKind } from "@/state/executionState";
import { relativeTime } from "@/state/relativeTime";
import { useTheme } from "@/hooks/useTheme";
import { ListRow } from "@/components/common/ListRow";

const stateIcons: Record<ExecutionStateKind, IconName> = {
  working: "play", "needs-approval": "hand-left", "needs-input": "chatbubble-ellipses", queued: "time", failed: "alert",
  stopped: "stop", done: "checkmark", idle: "ellipse"
};

export const ActivityRow = memo(function ActivityRow({ entry, now, onOpen }: { entry: ActivityEntry; now: Date; onOpen: (conversationId: string) => void }) {
  const { colors } = useTheme();
  const state = executionStateOf(entry.pendingRequestCount > 0 && runStateKind(entry.run) !== "needs-input" ? "needs-approval" : runStateKind(entry.run));
  const when = relativeTime(entry.run.updatedAt, now);
  return (
    <ListRow title={entry.conversationTitle} icon={{ icon: stateIcons[state.kind], color: colors.tones[state.tone].solid }} value={when} accessory="chevron"
      subtitle={entry.run.failure?.message ?? [state.label, entry.label].filter(Boolean).join(" · ")} onPress={() => onOpen(entry.conversationId)}
      accessibilityLabel={`${entry.conversationTitle}, ${state.label}, ${when}`} />
  );
});
