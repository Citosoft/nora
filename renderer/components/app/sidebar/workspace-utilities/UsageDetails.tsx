import { ExternalLink, LoaderCircle, MoreHorizontal, RefreshCcw, UserRound, Wrench } from "lucide-react";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { UsageDetailsProps } from "@/components/app/types/workspaceUtilities.types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function UsageDetails({ tool, usageInfo, isUsageLoading, isActionLoading, error, onInstall, onSwitchAccount, onRefresh }: UsageDetailsProps) {
  const usageDashboardUrl = tool.usageDashboardUrl;
  const isAuthUnavailable = usageInfo?.status === "unavailable";
  const hasWindows = !!usageInfo?.windows.length;
  const canInstall = !tool.detected;
  const hasActions = canInstall || tool.supportsUsageStatus || tool.supportsAccountSwitch || !!usageDashboardUrl || !!usageInfo?.details?.length;
  const accountActionLabel = isActionLoading ? "Signing in…" : isAuthUnavailable ? "Sign in" : "Switch account";

  return <section className="space-y-3 py-3" aria-label={`${tool.label} usage`} aria-busy={isUsageLoading}>
    <div className="flex items-center gap-2">
      <AgentToolIcon toolId={tool.id} label="" className="size-5 shrink-0" imageClassName="size-4" />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-xs font-medium">{tool.label}</h3>
        {usageInfo?.account && <p className="truncate text-[11px] text-muted-foreground" title={usageInfo.account}>{usageInfo.account}</p>}
      </div>
      {isUsageLoading && <LoaderCircle className="size-3 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />}
      {hasActions && <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="size-6 text-muted-foreground" aria-label={`${tool.label} usage options`}>
            <MoreHorizontal className="size-3.5" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" className="w-56 space-y-1 p-1" aria-label={`${tool.label} usage options`}>
          {usageInfo?.details?.map((detail) => <div key={detail.label} className="px-2 py-1 text-xs">
            <p className="text-muted-foreground">{detail.label}</p><p className="break-words">{detail.value}</p>
          </div>)}
          {canInstall && <Button type="button" variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={onInstall} disabled={tool.installStatus === "running" || isActionLoading}>
            <Wrench className="size-3.5" aria-hidden="true" />{tool.installStatus === "running" || isActionLoading ? "Installing…" : "Install"}
          </Button>}
          {tool.detected && tool.supportsAccountSwitch && <Button type="button" variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => onSwitchAccount(!!tool.supportsUsageStatus)} disabled={isActionLoading}>
            <UserRound className="size-3.5" aria-hidden="true" />{accountActionLabel}
          </Button>}
          {tool.detected && tool.supportsUsageStatus && <Button type="button" variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={onRefresh} disabled={isUsageLoading}>
            <RefreshCcw className="size-3.5" aria-hidden="true" />Refresh usage
          </Button>}
          {tool.detected && usageDashboardUrl && <Button type="button" variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => void noraSystemClient.openExternalUrl(usageDashboardUrl)}>
            <ExternalLink className="size-3.5" aria-hidden="true" />Usage dashboard
          </Button>}
        </PopoverContent>
      </Popover>}
    </div>
    {usageInfo?.windows.map((window) => <div key={window.id} className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="min-w-0 text-muted-foreground">{window.label}</span>
        <span className="shrink-0 tabular-nums">{window.percentLeft}% <span className="text-muted-foreground">left</span></span>
      </div>
      <div role="meter" aria-label={`${tool.label} ${window.label} remaining`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={window.percentLeft}
        className="h-1 overflow-hidden rounded-full bg-foreground/[0.07]">
        <div className="h-full rounded-full bg-foreground/50" style={{ width: `${window.percentLeft}%` }} />
      </div>
      <p className="text-[10px] leading-relaxed text-muted-foreground">{window.resetsLabel ? `Resets ${window.resetsLabel}` : "Reset time not reported"}</p>
    </div>)}
    {usageInfo?.notice && <p role="status" className="text-xs leading-relaxed text-muted-foreground">{usageInfo.notice}</p>}
    {!hasWindows && !usageInfo?.notice && !error && <p role="status" className="text-xs text-muted-foreground">
      {isUsageLoading ? "Checking usage…" : usageDashboardUrl && !tool.supportsUsageStatus ? "View usage in the provider dashboard." : "Usage unavailable."}
    </p>}
    {error && <p role="alert" className="text-xs leading-relaxed text-destructive">{error}</p>}
  </section>;
}
