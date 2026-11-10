import { useId, useState } from "react";
import { Gauge, ChevronDown } from "lucide-react";
import { useModelUsage } from "@/components/app/hooks/useModelUsage";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { ModelUsageProps } from "@/components/app/types/workspaceUtilities.types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UsageDetails } from "./UsageDetails";

export function ModelUsage({ collapsed, tools, onInstallTool, onSwitchToolAccount }: ModelUsageProps) {
  const detailsId = useId();
  const [openToolId, setOpenToolId] = useState<string | null>(null);
  const usage = useModelUsage({ tools, onInstallTool, onSwitchToolAccount });
  return <Popover>
    <PopoverTrigger asChild>
      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Open model usage" tooltip="Model usage"><Gauge className="size-4" aria-hidden="true" /></Button>
    </PopoverTrigger>
    <PopoverContent side={collapsed ? "right" : "top"} align="start" className="model-usage-popover w-80 space-y-3" aria-label="Model usage">
      <div><p className="text-sm font-medium">Model usage</p><p className="mt-1 text-xs text-muted-foreground">Usage limits and accounts across your agents.</p></div>
      <div className="max-h-[55vh] space-y-2 overflow-y-auto">
        {usage.visibleTools.map((tool) => {
          const info = usage.usageByToolId[tool.id] ?? null;
          const expanded = openToolId === tool.id;
          const summary = info?.windows.slice(0, 2).map((window) => `${window.shortLabel}${window.percentLeft}%`).join(" ");
          return <div key={tool.id} className="overflow-hidden rounded-lg border border-border/60">
            <button type="button" className="flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              aria-label={tool.label} aria-expanded={expanded} aria-controls={`${detailsId}-${tool.id}`} onClick={() => {
                setOpenToolId(expanded ? null : tool.id);
                if (!expanded && tool.supportsUsageStatus) void usage.loadToolUsage(tool.id);
              }}>
              <AgentToolIcon toolId={tool.id} label={tool.label} className="size-5 shrink-0" imageClassName="size-4" />
              <span className="min-w-0 flex-1 truncate font-medium">{tool.label}</span>
              <span className="text-[10px] tabular-nums text-muted-foreground">{summary || (info?.status === "unavailable" ? "Sign in" : "Details")}</span>
              <ChevronDown className={`size-3.5 shrink-0 text-muted-foreground ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {expanded && <div id={`${detailsId}-${tool.id}`}><UsageDetails tool={tool} usageInfo={info} isUsageLoading={usage.usageLoadingToolId === tool.id} isActionLoading={usage.actionToolId === tool.id}
              error={usage.toolErrorById[tool.id] ?? null} onInstall={() => void usage.installTool(tool.id)} onSwitchAccount={(refreshUsage) => void usage.switchToolAccount(tool.id, { refreshUsage })} onRefresh={() => void usage.loadToolUsage(tool.id)} /></div>}
          </div>;
        })}
        {!usage.visibleTools.length && <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">Enable an installed agent in Settings to see its usage here.</p>}
      </div>
    </PopoverContent>
  </Popover>;
}
