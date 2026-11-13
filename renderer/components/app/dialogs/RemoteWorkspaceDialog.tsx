import { ProjectDialogFrame } from "@/components/app/shared/ProjectDialogFrame";
import { ArrowRight, CircleHelp, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useRemoteWorkspaceConnection } from "@/components/app/hooks/useRemoteWorkspaceConnection";
import type { RemoteWorkspaceDialogProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import { RemoteWorkspaceForm } from "@/components/app/dialogs/RemoteWorkspaceForm";
import { RemoteWorkspaceSetup } from "@/components/app/dialogs/RemoteWorkspaceSetup";

export function RemoteWorkspaceDialog(props: RemoteWorkspaceDialogProps) {
  const connection = useRemoteWorkspaceConnection(props);
  const [showSetup, setShowSetup] = useState(false);
  useEffect(() => {
    if (props.open) setShowSetup(false);
  }, [props.open]);
  const {
    options,
    isLoading,
    isConnecting,
    isInstallingSupport,
    connectionMode,
    mountOutput,
    error,
    canSubmit,
    connect,
    installSupport,
  } = connection;
  const busy = isConnecting || isInstallingSupport;

  return (
    <ProjectDialogFrame
      open={props.open}
      onOpenChange={props.onOpenChange}
      busy={busy}
      title="Open remote project"
      description="Connect to a server using your SSH keys."
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (!showSetup) void connect();
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {showSetup ? (
            <RemoteWorkspaceSetup
              options={options}
              installing={isInstallingSupport}
              onInstall={installSupport}
            />
          ) : (
            <RemoteWorkspaceForm connection={connection} />
          )}
          {isLoading ? (
            <p
              role="status"
              className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"
            >
              <LoaderCircle className="size-3.5 animate-spin" />
              Reading SSH configuration…
            </p>
          ) : null}
          {!isLoading &&
          !showSetup &&
          (!options.support.supported || !options.directSsh.supported) ? (
            <button
              type="button"
              onClick={() => setShowSetup(true)}
              className="mt-4 text-left text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {!options.support.supported && !options.directSsh.supported
                ? "Connection support is unavailable. View setup"
                : "Missing a connection method? View setup"}
            </button>
          ) : null}
          {isConnecting || isInstallingSupport || mountOutput.length > 0 ? (
            <div className="mt-4 rounded-md bg-muted/40 p-3">
              <p className="mb-2 text-xs font-medium">Connection activity</p>
              <div
                role="log"
                aria-label="Connection activity"
                className="max-h-28 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-5 text-muted-foreground"
              >
                {mountOutput.length
                  ? mountOutput.map((line, index) => (
                      <div key={index}>{line}</div>
                    ))
                  : "Waiting for connection output…"}
              </div>
            </div>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-md bg-destructive/10 px-3 py-2.5 text-xs leading-5 text-destructive"
            >
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
            disabled={busy}
            onClick={() => setShowSetup((current) => !current)}
          >
            {showSetup ? (
              <ArrowRight className="size-3.5 rotate-180" />
            ) : (
              <CircleHelp className="size-3.5" />
            )}
            {showSetup ? "Connection" : "Setup & help"}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => props.onOpenChange(false)}
            >
              Cancel
            </Button>

            {!showSetup ? (
              <Button type="submit" size="sm" disabled={!canSubmit || busy}>
                {isConnecting ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="size-3.5" />
                )}
                {isConnecting
                  ? "Connecting…"
                  : connectionMode === "mount"
                    ? "Mount & choose folder"
                    : "Open project"}
              </Button>
            ) : null}
          </div>
        </div>
      </form>
    </ProjectDialogFrame>
  );
}
