import { Gauge } from "lucide-react";
import { useModelUsage } from "@/components/app/hooks/useModelUsage";
import type { ModelUsageProps } from "@/components/app/types/workspaceUtilities.types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UsageDetails } from "./UsageDetails";

export function ModelUsage({ collapsed, tools, onInstallTool, onSwitchToolAccount }: ModelUsageProps) {
  const usage = useModelUsage({ tools, onInstallTool, onSwitchToolAccount });

  return <Popover>
    <PopoverTrigger asChild>
      <Button variant="ghost" size="icon" className={`${collapsed ? "size-8" : "h-8 w-full min-w-0"} text-muted-foreground`} aria-label="Open model usage" tooltip="Model usage">
        <Gauge className="size-4" aria-hidden="true" />
      </Button>
    </PopoverTrigger>
    <PopoverContent side={collapsed ? "right" : "top"} align="start" className="w-72 max-w-[calc(100vw-2rem)] p-0" aria-label="Model usage">
      <h2 className="px-4 pb-1 pt-4 text-xs font-medium text-muted-foreground">Usage</h2>
      <div className="max-h-[55vh] divide-y divide-border/40 overflow-y-auto px-4 pb-1">
        {usage.visibleTools.map((tool) => {
          const entry = usage.usageByToolId[tool.id];
          return <UsageDetails key={tool.id} tool={tool} usageInfo={entry?.info ?? null}
            isUsageLoading={!!entry?.loading} isActionLoading={usage.actionToolId === tool.id}
            error={usage.toolError(tool.id)} onInstall={() => void usage.installTool(tool.id)}
            onSwitchAccount={(refreshUsage) => void usage.switchToolAccount(tool.id, { refreshUsage })}
            onRefresh={() => void usage.loadToolUsage(tool.id, true)} />;
        })}
        {!usage.visibleTools.length && <p className="py-4 text-xs text-muted-foreground">Enable a provider in Settings to see usage.</p>}
      </div>
    </PopoverContent>
  </Popover>;
}
