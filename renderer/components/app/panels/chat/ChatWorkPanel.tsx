import { groupChatWorkThreads } from "@/components/app/logic/chatWorkGroups";
import { useThreadTime } from "@/components/app/hooks/useThreadTime";
import type { ChatWorkPanelProps } from "@/components/app/types/chatPanels.types";
import { ChatWorkSection } from "./ChatWorkSection";
import { ChatActivityTimeline } from "./ChatActivityTimeline";
import { ChatWorkRow } from "./ChatWorkRow";

/** The bot's work stays reachable throughout its lifecycle, including completed threads; only phases with threads get a section. */
export function ChatWorkPanel({ threads, activity, onOpenThread, onSettleThread }: ChatWorkPanelProps) {
  const now = useThreadTime();
  const groups = groupChatWorkThreads(threads);
  return <div className="thin-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-2 py-3 text-sm">
    {!groups.length && <p className="px-2 text-xs text-muted-foreground">No work yet. Threads show up here once work starts.</p>}
    {groups.map((group) => <ChatWorkSection key={group.phase} title={group.title} count={group.threads.length}>
      {group.threads.map((thread) => <ChatWorkRow key={thread.id} thread={thread} now={now}
        onOpenThread={onOpenThread} onSettleThread={onSettleThread} />)}
    </ChatWorkSection>)}
    <ChatWorkSection title="Activity" count={activity.length}>
      <ChatActivityTimeline events={activity} onOpenThread={onOpenThread} />
    </ChatWorkSection>
  </div>;
}
