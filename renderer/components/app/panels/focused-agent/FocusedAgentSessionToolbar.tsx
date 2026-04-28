import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { statusVariant } from "@/components/app/logic/utils";
import type { FocusedAgentSessionToolbarProps } from "@/components/app/types/focusedAgentSessionChrome.types";
import { SessionPidBadge } from "@/components/app/shared/SessionPidBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Info, MonitorPlay, RotateCcw, Trash2, X } from "lucide-react";

export const FocusedAgentSessionToolbar = ({
  compact,
  agent,
  terminal,
  focusedSession,
  onToggleSessionInfo,
  onToggleContext,
  onClearTerminal,
  onRestart,
  onDestroy
}: FocusedAgentSessionToolbarProps) => (
  <div className="pointer-events-none absolute right-6 top-3 z-20 flex items-center gap-2">
    {compact ? (
      <Badge variant={statusVariant(focusedSession?.status || "stopped")} className="pointer-events-auto px-1.5 py-0 text-[10px]">
        {focusedSession?.status || "stopped"}
      </Badge>
    ) : focusedSession?.pid != null ? (
      <div className="pointer-events-auto">
        <SessionPidBadge pid={focusedSession.pid} />
      </div>
    ) : (
      <Badge variant={statusVariant(focusedSession?.status || "stopped")} className="pointer-events-auto">
        {focusedSession?.status}
      </Badge>
    )}
    {terminal?.detectedLocalPort ? (
      <Badge variant="outline" className="pointer-events-auto">
        :{terminal.detectedLocalPort}
      </Badge>
    ) : null}
    {terminal?.detectedLocalUrl ? (
      <Button
        variant="ghost"
        size="icon"
        className="pointer-events-auto size-8 bg-transparent text-muted-foreground hover:bg-transparent hover:text-foreground"
        onClick={() => void noraSystemClient.openExternalUrl(terminal.detectedLocalUrl!)}
        title={terminal.detectedLocalUrl}
        aria-label="Open detected local URL"
      >
        <MonitorPlay className="size-3.5" />
      </Button>
    ) : null}
    <Button
      variant="ghost"
      size="icon"
      tooltip="Show session details"
      className="pointer-events-auto size-8 bg-transparent text-muted-foreground hover:bg-transparent hover:text-foreground"
      onClick={onToggleSessionInfo}
      aria-label="Show session details"
    >
      <Info className="size-3.5" />
    </Button>
    {agent ? (
      <Button
        variant="ghost"
        size="icon"
        className="pointer-events-auto size-8 bg-transparent text-muted-foreground hover:bg-transparent hover:text-foreground"
        onClick={onToggleContext}
        aria-label="Toggle context panel"
      >
        <FileText className="size-3.5" />
      </Button>
    ) : null}
    <Button
      variant="ghost"
      size="icon"
      className="pointer-events-auto size-8 bg-transparent text-muted-foreground hover:bg-transparent hover:text-foreground"
      onClick={() => void onClearTerminal()}
      aria-label="Clear terminal output"
    >
      <X className="size-3.5" />
    </Button>
    {(agent && agent.status !== "running") || terminal ? (
      <Button
        variant="ghost"
        size="icon"
        className="pointer-events-auto size-8 bg-transparent text-muted-foreground hover:bg-transparent hover:text-foreground"
        onClick={() => void onRestart()}
        title={agent?.resumeCommand || terminal?.command}
        aria-label="Restart session"
      >
        <RotateCcw className="size-3.5" />
      </Button>
    ) : null}
    <Button
      variant="ghost"
      size="icon"
      className="pointer-events-auto size-8 bg-transparent text-destructive/80 hover:bg-transparent hover:text-destructive"
      onClick={onDestroy}
      aria-label="Destroy session"
    >
      <Trash2 className="size-3.5" />
    </Button>
  </div>
);
