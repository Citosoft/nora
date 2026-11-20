import { useMemo } from "react";
import { AlarmClock, BellDot, Inbox, ShieldQuestion } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { inboxViewCounts } from "@/components/app/logic/inbox/sections";
import { useInbox } from "@/components/app/hooks/useInbox";
import { useThreadNavigationPorts } from "@/components/app/hooks/useThreadNavigationPorts";
import { useThreadTime } from "@/components/app/hooks/useThreadTime";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import type { InboxSidebarProps, InboxView } from "@/components/app/types/inbox.types";

const VIEW_ICONS: Readonly<Record<InboxView, LucideIcon>> = { all: Inbox, "needs-you": ShieldQuestion, updates: BellDot, snoozed: AlarmClock };

/** The inbox's views, each with its count; choosing one shows it in the center. */
export function InboxSidebar({ collapsed }: InboxSidebarProps) {
  const { state } = useInbox();
  const navigation = useWorkspaceNavigation();
  const { showHome } = useThreadNavigationPorts();
  const time = useThreadTime();
  const counts = useMemo(() => inboxViewCounts(state.snapshot.items, null, new Date(time).toISOString()), [state.snapshot.items, time]);
  const select = (inboxView: InboxView): void => { navigation.closeTool(); navigation.setPreferences((current) => ({ ...current, inboxView })); showHome(); };
  if (collapsed) return <div className="min-h-0 flex-1" />;
  return <nav aria-label="Inbox views" className="min-h-0 flex-1 overflow-y-auto px-3">
    <ul className="space-y-0.5">{counts.map(({ view, label, count }) => {
      const Icon = VIEW_ICONS[view];
      const active = navigation.preferences.inboxView === view;
      return <li key={view}><button type="button" aria-current={active ? "page" : undefined} onClick={() => select(view)}
        className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-muted/50"}`}>
        <Icon className="size-4 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1 truncate">{label}</span>
        {count > 0 && <span className={`text-xs tabular-nums ${view === "needs-you" ? "text-amber-600 dark:text-amber-400" : ""}`}>{count}</span>}
      </button></li>;
    })}</ul>
  </nav>;
}
