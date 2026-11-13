import { useState } from "react";
import { Activity, BookOpen, CircleHelp, Compass, Keyboard, Moon, Settings, Sun, TerminalSquare, Unplug, Wrench } from "lucide-react";
import { APP_DOCS_URL } from "@shared/appMeta";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { AppMark } from "@/components/app/shared/AppMark";
import type { AppToolsProps } from "@/components/app/types/workspaceUtilities.types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function AppTools({ collapsed = false, settingsActive = false, ...actions }: AppToolsProps) {
  const [open, setOpen] = useState(false);
  const helpActions = [
    { label: "Documentation", icon: BookOpen, run: () => { void noraSystemClient.openExternalUrl(APP_DOCS_URL); } },
    { label: "Startup dependencies", icon: Wrench, run: actions.onOpenStartupDependencies },
    { label: "Resource monitor", icon: Activity, run: actions.onOpenResourceMonitor },
    { label: "Open onboarding", icon: Compass, run: actions.onOpenOnboarding },
    { label: "Submit issue", icon: CircleHelp, run: actions.onSubmitIssue }
  ];
  const run = (action?: () => void): void => { setOpen(false); action?.(); };
  const themeLabel = `Switch to ${actions.resolvedTheme === "dark" ? "light" : "dark"} theme`;
  const footerActions = [
    { label: "Connections", icon: Unplug, run: actions.onOpenConnectionsSettings },
    { label: "Home terminal", icon: TerminalSquare, run: actions.onOpenHomeTerminal },
    { label: "Keyboard shortcuts", icon: Keyboard, run: actions.onOpenKeyboardShortcuts },
    { label: themeLabel, icon: actions.resolvedTheme === "dark" ? Sun : Moon, run: actions.onToggleTheme }
  ];
  return <nav aria-label="App tools" className={`flex min-w-0 items-center gap-1 ${collapsed ? "flex-col" : "flex-wrap"}`}>
    {footerActions.map(({ label, icon: Icon, run: action }) => action && <Button key={label} type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" aria-label={label} tooltip={label} onClick={action}>
      <Icon className="size-4" aria-hidden="true" />
    </Button>)}
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button variant="ghost" size="icon" aria-label="Open app menu" aria-pressed={settingsActive} tooltip="Settings and help" className={`size-8 ${settingsActive ? "bg-accent text-foreground" : "text-muted-foreground"}`}><Settings className="size-4" aria-hidden="true" /></Button></PopoverTrigger>
      <PopoverContent side={collapsed ? "right" : "top"} align="start" className="w-64 max-h-[70vh] overflow-y-auto p-1.5" aria-label="Settings and help">
        <p className="px-3 py-2 text-xs font-medium">App settings</p>
        <Button variant="ghost" className="h-9 w-full justify-start text-xs" aria-label="Open settings" onClick={() => run(actions.onOpenSettings)}><Settings className="size-4" aria-hidden="true" />Settings</Button>
        <div className="my-1 border-t" />
        {helpActions.map(({ label, icon: Icon, run: action }) => <Button key={label} variant="ghost" className="h-9 w-full justify-start text-xs" onClick={() => run(action)}><Icon className="size-4" aria-hidden="true" />{label}</Button>)}
        <Button variant="ghost" className="h-9 w-full justify-start text-xs" onClick={() => run(actions.onOpenAbout)}><AppMark className="size-4" />About Nora</Button>
      </PopoverContent>
    </Popover>
  </nav>;
}
