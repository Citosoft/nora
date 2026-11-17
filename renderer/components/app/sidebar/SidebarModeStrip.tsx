import { MessagesSquare, Bot } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { useThreadNavigationPorts } from "@/components/app/hooks/useThreadNavigationPorts";
import { SidebarIconButton } from "@/components/app/sidebar/SidebarIconButton";
import { SidebarWorkspaceTools } from "@/components/app/sidebar/SidebarWorkspaceTools";
import { SidebarUserAvatar } from "@/components/app/sidebar/SidebarUserAvatar";
import { SIDEBAR_MODE_STRIP_WIDTH } from "@/components/app/constants/uiLayout";
import type { SidebarModeStripProps } from "@/components/app/types/botNavigation.types";
import type { SidebarMode } from "@/components/app/types/workspaceNavigation.types";

const MODES: readonly { mode: SidebarMode; label: string; icon: LucideIcon }[] = [
  { mode: "threads", label: "Threads", icon: MessagesSquare },
  { mode: "bots", label: "Bots", icon: Bot }
];

/** Persistent navigation for threads, bots and the active workspace's tools. */
export function SidebarModeStrip({ edge }: SidebarModeStripProps) {
  const navigation = useWorkspaceNavigation();
  const mode = navigation.preferences.sidebarMode;
  const { showHome } = useThreadNavigationPorts();
  // Choosing Bots opens Bots home; going back to Threads keeps whatever thread is open.
  const select = (sidebarMode: SidebarMode): void => {
    navigation.setPreferences((current) => ({ ...current, sidebarMode }));
    navigation.closeTool();
    if (sidebarMode === "bots") showHome();
  };
  return <nav aria-label="Sidebar view" style={{ width: SIDEBAR_MODE_STRIP_WIDTH }}
    className={`workspace-shell-surface workspace-chrome-surface flex h-full min-h-0 shrink-0 flex-col items-center gap-1 border-border/70 py-3 ${edge === "left" ? "border-r" : "border-l"}`}>
    <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto">
      {MODES.map(({ mode: entry, label, icon }) => <SidebarIconButton key={entry} label={label} icon={icon}
        active={entry === mode && !navigation.route} onSelect={() => select(entry)} />)}
      <SidebarWorkspaceTools edge={edge} />
    </div>
    <div className="mt-auto flex justify-center pt-2"><SidebarUserAvatar /></div>
  </nav>;
}
