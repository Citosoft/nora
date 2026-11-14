import { useState } from "react";
import { CircleArrowUp } from "lucide-react";
import { AppMark } from "@/components/app/shared/AppMark";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { NoraUpdateIndicator, NoraUpdateState, ProviderUpdatesIndicator, UpdateIndicators as UpdateIndicatorsInput } from "@/components/app/types/updateIndicators.types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const IndicatorDot = () => <span className="absolute right-1 top-1 size-1.5 rounded-full bg-primary ring-2 ring-background" aria-hidden="true" />;

function ProviderUpdatesButton({ notices, onUpdate, collapsed }: ProviderUpdatesIndicator & { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const label = notices.length === 1 ? `${notices[0].label} update available` : `${notices.length} provider updates available`;
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button variant="ghost" size="icon" aria-label={label} tooltip={label} className={`relative ${collapsed ? "size-8" : "h-8 w-full min-w-0"} text-muted-foreground`}>
        <CircleArrowUp className="size-4" aria-hidden="true" /><IndicatorDot />
      </Button>
    </PopoverTrigger>
    <PopoverContent side={collapsed ? "right" : "top"} align="start" className="w-72 p-1.5" aria-label="Provider updates">
      <p className="px-2 py-1.5 text-xs font-medium">Provider updates</p>
      <ul className="space-y-0.5">
        {notices.map((notice) => <li key={notice.toolId} className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
          <AgentToolIcon toolId={notice.toolId} label="" className="size-6 shrink-0 rounded-md bg-muted/80" imageClassName="size-4" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{notice.label}</p>
            <p className="truncate text-[11px] text-muted-foreground">{notice.installedVersion} → {notice.latestVersion}</p>
          </div>
          <Button variant="secondary" size="sm" className="h-7 px-2.5 text-xs" aria-label={`Update ${notice.label}`}
            onClick={() => { setOpen(false); onUpdate(notice.toolId); }}>Update</Button>
        </li>)}
      </ul>
    </PopoverContent>
  </Popover>;
}

function noraUpdateLabel(state: NoraUpdateState): string {
  const name = state.latestVersion ? `Nora ${state.latestVersion}` : "A Nora update";
  switch (state.phase) {
    case "downloading": return `${name} is downloading`;
    case "installing": return `${name} is installing`;
    case "ready": return `${name} is ready — restart to install`;
    case "manual": return `${name} is available — view release`;
  }
}

function NoraUpdateButton({ state, onInstall, onOpenRelease, collapsed }: NoraUpdateIndicator & { collapsed: boolean }) {
  const label = noraUpdateLabel(state);
  const busy = state.phase === "downloading" || state.phase === "installing";
  // While busy the button stays focusable so its tooltip still explains the in-progress state.
  const run = (): void => {
    if (state.phase === "ready") onInstall();
    else if (state.phase === "manual") onOpenRelease();
  };
  return <Button variant="ghost" size="icon" aria-label={label} aria-disabled={busy} tooltip={label}
    className={`relative ${collapsed ? "size-8" : "h-8 w-full min-w-0"} ${busy ? "cursor-default opacity-70" : ""}`} onClick={run}>
    <AppMark className={`size-4 shrink-0 ${busy ? "motion-safe:animate-pulse" : ""}`} />
    {!busy && <IndicatorDot />}
  </Button>;
}

/** Footer indicators for available updates; renders nothing when everything is current. */
export function UpdateIndicators({ providers, nora, collapsed }: UpdateIndicatorsInput & { collapsed: boolean }) {
  if (!providers && !nora) return null;
  return <div role="group" aria-label="Available updates" className={collapsed ? "flex flex-col items-center gap-1" : "contents"}>
    {nora && <NoraUpdateButton {...nora} collapsed={collapsed} />}
    {providers && <ProviderUpdatesButton {...providers} collapsed={collapsed} />}
  </div>;
}
