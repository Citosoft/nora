import { useMemo } from "react";
import { MessagesSquare, Bot, Inbox, Smartphone, Unplug } from "lucide-react";
import { APPS_SECTION_ICON } from "@/components/app/constants/appsSectionIcon";
import { inboxCounts } from "@shared/inbox/projection";
import { useInbox } from "@/components/app/hooks/useInbox";
import { useThreadTime } from "@/components/app/hooks/useThreadTime";
import type { LucideIcon } from "lucide-react";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { useThreadNavigationPorts } from "@/components/app/hooks/useThreadNavigationPorts";
import { useWorkspaceSidebarPorts } from "@/components/app/hooks/useWorkspaceSidebarPorts";
import { SidebarIconButton } from "@/components/app/sidebar/SidebarIconButton";
import { SidebarWorkspaceTools } from "@/components/app/sidebar/SidebarWorkspaceTools";
import { SidebarUserAvatar } from "@/components/app/sidebar/SidebarUserAvatar";
import { ModelUsage } from "@/components/app/sidebar/model-usage/ModelUsage";
import { SIDEBAR_MODE_STRIP_WIDTH } from "@/components/app/constants/uiLayout";
import type { SidebarModeStripProps } from "@/components/app/types/botNavigation.types";
import type { SidebarMode } from "@/components/app/types/workspaceNavigation.types";

const MODES: readonly { mode: SidebarMode; label: string; icon: LucideIcon }[] = [
  { mode: "inbox", label: "Inbox", icon: Inbox },
  { mode: "threads", label: "Threads", icon: MessagesSquare },
  { mode: "bots", label: "Bots", icon: Bot },
  { mode: "apps", label: "Apps", icon: APPS_SECTION_ICON }
];

/** Persistent navigation for the inbox, threads, bots, apps, the active workspace's tools, connections, model usage and the phone app page. */
export function SidebarModeStrip({ edge }: SidebarModeStripProps) {
  const navigation = useWorkspaceNavigation();
  const mode = navigation.preferences.sidebarMode;
  const { showHome } = useThreadNavigationPorts();
  const { onOpenConnectionsSettings } = useWorkspaceSidebarPorts();
  const { state } = useInbox();
  const time = useThreadTime();
  const waiting = useMemo(() => inboxCounts(state.snapshot.items, new Date(time).toISOString()).needsYou, [state.snapshot.items, time]);
  // Choosing Bots or Inbox opens its home; going back to Threads keeps whatever thread is open.
  const select = (sidebarMode: SidebarMode): void => {
    navigation.setPreferences((current) => ({ ...current, sidebarMode }));
    navigation.closeTool();
    if (sidebarMode !== "threads") showHome();
  };
  return <nav aria-label="Sidebar view" style={{ width: SIDEBAR_MODE_STRIP_WIDTH }}
    className={`workspace-shell-surface workspace-chrome-surface flex h-full min-h-0 shrink-0 flex-col items-center gap-1 border-border/70 py-3 ${edge === "left" ? "border-r" : "border-l"}`}>
    <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto">
      {MODES.map(({ mode: entry, label, icon }) => <SidebarIconButton key={entry} label={label} icon={icon}
        active={entry === mode && !navigation.route} badge={entry === "inbox" ? waiting : 0} onSelect={() => select(entry)} />)}
      <SidebarWorkspaceTools edge={edge} />
    </div>
    <div className="mt-auto flex flex-col items-center gap-1 pt-2">
      <SidebarIconButton label="Connections" icon={Unplug} active={false} onSelect={onOpenConnectionsSettings} />
      <ModelUsage edge={edge} />
      <SidebarIconButton label="Mobile" icon={Smartphone} active={mode === "mobile" && !navigation.route} onSelect={() => select("mobile")} />
      <SidebarUserAvatar />
    </div>
  </nav>;
}
