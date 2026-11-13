import { MessagesSquare, Bot } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { useThreadNavigationPorts } from "@/components/app/hooks/useThreadNavigationPorts";
import { SidebarUserAvatar } from "@/components/app/sidebar/SidebarUserAvatar";
import { Button } from "@/components/ui/button";
import { SIDEBAR_MODE_STRIP_WIDTH } from "@/components/app/constants/uiLayout";
import type { SidebarModeStripProps } from "@/components/app/types/botNavigation.types";
import type { SidebarMode } from "@/components/app/types/workspaceNavigation.types";

const MODES: readonly { mode: SidebarMode; label: string; icon: LucideIcon }[] = [
  { mode: "threads", label: "Threads", icon: MessagesSquare },
  { mode: "bots", label: "Bots", icon: Bot }
];

/** Vertical strip on the sidebar's outer edge that switches it between threads and bots; it stays visible when the sidebar collapses. */
export function SidebarModeStrip({ edge }: SidebarModeStripProps) {
  const navigation = useWorkspaceNavigation();
  const mode = navigation.preferences.sidebarMode;
  const { showHome } = useThreadNavigationPorts();
  // Choosing Bots opens Bots home; going back to Threads keeps whatever thread is open.
  const select = (sidebarMode: SidebarMode): void => {
    navigation.setPreferences((current) => ({ ...current, sidebarMode }));
    if (sidebarMode === "bots") { navigation.closeTool(); showHome(); }
  };
  return <nav aria-label="Sidebar view" style={{ width: SIDEBAR_MODE_STRIP_WIDTH }}
    className={`workspace-shell-surface workspace-chrome-surface flex h-full shrink-0 flex-col items-center gap-1 border-border/70 py-3 ${edge === "left" ? "border-r" : "border-l"}`}>
    {MODES.map(({ mode: entry, label, icon: Icon }) => {
      const active = entry === mode;
      return <Button key={entry} type="button" variant="ghost" size="icon" aria-label={label} aria-pressed={active} tooltip={label}
        onClick={() => select(entry)} className={`size-9 ${active ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>
        <Icon className="size-5" aria-hidden="true" />
      </Button>;
    })}
    <div className="mt-auto flex justify-center pt-2"><SidebarUserAvatar /></div>
  </nav>;
}
