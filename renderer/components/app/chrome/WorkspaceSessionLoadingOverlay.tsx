import type { WorkspaceSessionLoadingOverlayProps } from "@/components/app/types/workspaceSessionLoadingOverlay.types";
import { FolderGit2, LoaderCircle, Server } from "lucide-react";

export const WorkspaceSessionLoadingOverlay = ({
  workspaceLoading,
  isAddingWorkspace,
  appClosingState,
  onDismissWorkspaceLoading
}: WorkspaceSessionLoadingOverlayProps) => {
  if (!workspaceLoading && !isAddingWorkspace && !appClosingState) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/88 px-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[6px] border border-border/70 bg-card/95 p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 rounded-[4px] border border-border/70 bg-background/70 p-2 text-primary">
            {appClosingState ? (
              <LoaderCircle className="size-5 animate-spin" />
            ) : workspaceLoading?.kind === "ssh" ? (
              <Server className="size-5" />
            ) : (
              <FolderGit2 className="size-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <LoaderCircle className="size-4 animate-spin text-primary" />
              <div className="text-sm font-medium text-foreground">
                {appClosingState ? "Closing app" : workspaceLoading ? "Loading workspace" : "Adding workspace"}
              </div>
            </div>
            <div className="mt-3 text-lg font-semibold text-foreground">
              {appClosingState ? "Waiting for agents to shut down" : workspaceLoading?.projectName || "Selected folder"}
            </div>
            <div className="mt-1 truncate text-sm text-muted-foreground">
              {appClosingState
                ? "The app will exit once running agents have finished shutting down."
                : workspaceLoading?.targetLabel || "Opening the selected repository..."}
            </div>
            <div className="mt-4 rounded-[4px] border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground">
              {appClosingState?.detail || workspaceLoading?.detail || "Waiting for the workspace to finish loading..."}
            </div>
            {appClosingState?.command || workspaceLoading?.command ? (
              <div className="mt-3 rounded-[4px] border border-border/60 bg-background/60 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {appClosingState ? "Shutdown step" : "Current command"}
                </div>
                <div className="mt-1 break-all font-mono text-xs text-foreground">
                  {appClosingState?.command || workspaceLoading?.command}
                </div>
              </div>
            ) : null}
            {workspaceLoading && !appClosingState ? (
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  If the load fails, you can dismiss this overlay and continue using the app.
                </div>
                <button
                  type="button"
                  onClick={onDismissWorkspaceLoading}
                  className="shrink-0 rounded-[4px] border border-border/70 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-background/70"
                >
                  Dismiss
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
