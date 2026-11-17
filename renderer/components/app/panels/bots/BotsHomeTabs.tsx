import { Bot, CalendarDays } from "lucide-react";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { cn } from "@/lib/utils";
import type { BotsHomePage, BotsHomeTabsProps } from "@/components/app/types/routineCalendar.types";

const PAGES: readonly { id: BotsHomePage; label: string; icon: typeof Bot }[] = [{ id: "bots", label: "Bots", icon: Bot }, { id: "routines", label: "Routines", icon: CalendarDays }];

/** Switches the Bots home between your bots and the calendar of every bot's routines; the choice is remembered. */
export function BotsHomeTabs({ page }: BotsHomeTabsProps) {
  const { setPreferences } = useWorkspaceNavigation();
  return <div role="tablist" aria-label="Bots home" className="flex gap-1">
    {PAGES.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={page === id}
      onClick={() => setPreferences((current) => ({ ...current, botsHome: id }))}
      className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        page === id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}>
      <Icon className="size-3.5" aria-hidden="true" />{label}</button>)}
  </div>;
}
