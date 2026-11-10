import { Fragment } from "react";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { Button } from "@/components/ui/button";
import type { UsageDetailsProps, UsageWindowRowProps } from "@/components/app/types/workspaceUtilities.types";
import { ExternalLink, LoaderCircle, RefreshCcw, UserRound, Wrench } from "lucide-react";

function UsageWindowRow({ window }: UsageWindowRowProps) {
  return (
    <>
      <div className="text-[11px] text-muted-foreground">{window.label}</div>
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary/80" style={{ width: `${window.percentLeft}%` }} />
          </div>
          <div className="w-16 shrink-0 text-right text-xs tabular-nums text-foreground">{window.percentLeft}% left</div>
        </div>
        <div className="truncate text-xs text-muted-foreground" title={window.resetsLabel ?? "Reset time not reported"}>
          {window.resetsLabel ? `Resets ${window.resetsLabel}` : "Reset time not reported"}
        </div>
      </div>
    </>
  );
}

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
          <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-sm">
            {usageInfo?.windows.map((window) => <UsageWindowRow key={window.id} window={window} />)}
            {usageInfo?.account ? (
              <>
                <div className="text-[11px] text-muted-foreground">User</div>
                <div className="min-w-0 truncate text-foreground" title={usageInfo.account}>{usageInfo.account}</div>
              </>
            ) : null}
            {usageInfo?.details?.map((detail) => (
              <Fragment key={detail.label}>
                <div className="text-[11px] text-muted-foreground">{detail.label}</div>
                <div className="min-w-0 truncate text-foreground" title={detail.value}>{detail.value}</div>
              </Fragment>
            ))}
          </div>
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
