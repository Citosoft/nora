import { useLocalTerminalDock } from "@/components/app/context/localTerminalDockContext";
import { formatTimestamp, statusVariant } from "@/components/app/logic/utils";
import { SessionTerminal } from "@/components/app/panels/SessionTerminal";
import { SessionPidBadge } from "@/components/app/shared/SessionPidBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoaderCircle, TerminalSquare, X } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";

const MIN_DOCK_HEIGHT = 180;
const MAX_DOCK_HEIGHT = 520;

export function LocalTerminalDock() {
  const {
    terminal,
    resolvedTheme,
    terminalThemeId,
    terminalFontId,
    height,
    isCollapsed,
    focusVersion,
    onHeightChange,
    onToggleCollapsed
  } = useLocalTerminalDock();
  const canSendInput = terminal?.status === "running";
  const clampedHeight = Math.min(MAX_DOCK_HEIGHT, Math.max(MIN_DOCK_HEIGHT, Math.round(height)));

  const startResize = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (isCollapsed) {
      return;
    }

    event.preventDefault();
    const startY = event.clientY;
    const startHeight = clampedHeight;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextHeight = Math.min(
        MAX_DOCK_HEIGHT,
        Math.max(MIN_DOCK_HEIGHT, Math.round(startHeight - (moveEvent.clientY - startY)))
      );
      onHeightChange(nextHeight);
    };

    const stopResize = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
  };

  return (
    <div
      id="local-terminal-dock"
      role="region"
      aria-label="Local terminal"
      hidden={isCollapsed}
      className="shrink-0 border-t border-border/60 bg-card/90"
      style={{ height: clampedHeight }}
    >
      <div
        className="workspace-shell-surface group grid h-2 cursor-row-resize place-items-center"
        onPointerDown={startResize}
        role="separator"
        aria-label="Resize local terminal"
        aria-orientation="horizontal"
      >
        <div className="h-px w-16 rounded-full bg-border/60 transition-colors group-hover:bg-primary/50" />
      </div>
      {terminal ? (
        <div className="flex h-[calc(100%-0.5rem)] min-h-0 flex-col bg-card">
          <div className="workspace-shell-surface flex items-center justify-between border-b border-border/60 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <TerminalSquare className="size-4 shrink-0 text-primary" />
              <span className="truncate">Local Terminal</span>
              <Badge variant="outline">{terminal.shellLabel}</Badge>
              <span className="truncate text-xs font-normal text-muted-foreground">
                Updated {formatTimestamp(terminal.lastEventAt)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {terminal.pid ? (
                <SessionPidBadge pid={terminal.pid} />
              ) : (
                <Badge variant={statusVariant(terminal.status)}>{terminal.status}</Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={onToggleCollapsed}
                aria-label="Close local terminal"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
          <SessionTerminal
            sessionId={terminal.id}
            resetVersion={0}
            focusVersion={focusVersion}
            submission={null}
            canSendInput={canSendInput}
            resolvedTheme={resolvedTheme}
            terminalThemeId={terminalThemeId}
            terminalFontId={terminalFontId}
          />
        </div>
      ) : (
        <div className="flex h-[calc(100%-0.5rem)] items-center justify-center px-6">
          <div className="flex max-w-md flex-col items-center gap-3 text-center">
            <div className="grid size-11 place-items-center rounded-lg border border-border/70 bg-background text-primary">
              <LoaderCircle className="size-5 animate-spin" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">Starting local terminal</div>
              <div className="text-sm text-muted-foreground">
                Opening a dedicated home-directory shell in the bottom dock.
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onToggleCollapsed}>
              <X className="size-4" aria-hidden="true" />
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
