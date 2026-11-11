import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { Button } from "@/components/ui/button";
import type { UsageDetailsProps } from "@/components/app/types/workspaceUtilities.types";
import { UsageSummaryGrid } from "@/components/app/shared/UsageSummaryGrid";
import { ExternalLink, LoaderCircle, RefreshCcw, UserRound, Wrench } from "lucide-react";

export function UsageDetails({ tool, usageInfo, isUsageLoading, isActionLoading, error, onInstall, onSwitchAccount, onRefresh }: UsageDetailsProps) {
  const usageDashboardUrl = tool.usageDashboardUrl;
  const isAuthUnavailable = usageInfo?.status === "unavailable";
  const installActionLabel = tool.installStatus === "running" || isActionLoading ? "Installing…" : "Install";
  const accountActionLabel = isActionLoading ? (isAuthUnavailable ? "Logging in…" : "Switching…") : (isAuthUnavailable ? "Login" : "Switch account");
  return <div className="space-y-3 border-t border-border/50 p-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AgentToolIcon toolId={tool.id} label={tool.label} className="size-6 rounded-[4px]" imageClassName="size-4" />
        <div className="text-sm font-medium text-foreground">{tool.label}</div>
      </div>
      {isUsageLoading ? <LoaderCircle className="size-3.5 animate-spin text-primary" /> : null}
    </div>
    {!tool.detected ? (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center"
          onClick={() => { onInstall(); }}
          disabled={tool.installStatus === "running" || isActionLoading}
        >
          {tool.installStatus === "running" || isActionLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Wrench className="size-4" />}
          {installActionLabel}
        </Button>
      ) : usageDashboardUrl && !tool.supportsUsageStatus ? (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center"
            onClick={() => {
              void noraSystemClient.openExternalUrl(usageDashboardUrl);
            }}
          >
            Open usage dashboard
          </Button>
          <div className="truncate text-xs text-muted-foreground" title={usageDashboardUrl}>
            {usageDashboardUrl}
          </div>
          {tool.supportsAccountSwitch ? (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center"
              onClick={() => {
                onSwitchAccount(false);
              }}
              disabled={isActionLoading}
            >
              {isActionLoading ? <LoaderCircle className="size-4 animate-spin" /> : <UserRound className="size-4" />}
              {accountActionLabel}
            </Button>
          ) : null}
        </div>
      ) : tool.supportsUsageStatus ? (
        <>
          {usageInfo ? <UsageSummaryGrid info={usageInfo} /> : null}
          {usageInfo?.notice ? (
            <div role="status" className="text-xs text-muted-foreground">{usageInfo.notice}</div>
          ) : null}
          <div className="flex items-center gap-2">
            {tool.supportsAccountSwitch ? (
              <Button
                type="button"
                variant="outline"
                className="flex-1 justify-center"
                onClick={() => {
                  onSwitchAccount(true);
                }}
                disabled={isActionLoading}
              >
                {isActionLoading ? <LoaderCircle className="size-4 animate-spin" /> : <UserRound className="size-4" />}
                {accountActionLabel}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onRefresh();
              }}
              disabled={isUsageLoading}
              aria-label={`Refresh ${tool.label} usage`}
            >
              <RefreshCcw className="size-4" />
            </Button>
            {usageDashboardUrl ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void noraSystemClient.openExternalUrl(usageDashboardUrl);
                }}
                aria-label={`Open ${tool.label} usage dashboard`}
                title="Open usage dashboard"
              >
                <ExternalLink className="size-4" />
              </Button>
            ) : null}
          </div>
        </>
      ) : tool.supportsAccountSwitch ? (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center"
          onClick={() => {
            onSwitchAccount(false);
          }}
          disabled={isActionLoading}
        >
          {isActionLoading ? <LoaderCircle className="size-4 animate-spin" /> : <UserRound className="size-4" />}
          {accountActionLabel}
        </Button>
      ) : null}
    {error ? (
      <div className="rounded-[6px] border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
        {error}
      </div>
    ) : null}
  </div>;
}
