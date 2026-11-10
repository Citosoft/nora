import type { UtilityPanelProps } from "@/components/app/types/workspaceUtilities.types";
import { useRemoteMounts } from "@/components/app/hooks/useRemoteMounts";
import { formatRemoteMountBadgeLabel, formatRemoteMountTarget } from "@/components/app/logic/remoteMountPresentation";
import { Button } from "@/components/ui/button";
import { FolderOpen, LoaderCircle, Unplug } from "lucide-react";

/** Workspace-tools view listing active SSH remote mounts with their project and unmount actions. */
export function RemoteMountsPanel({ onClose }: UtilityPanelProps) {
  const model = useRemoteMounts();

  if (!model) {
    return null;
  }

  const { mounts, unmountingMountPoint, chooseProjectInMount, unmount } = model;

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-medium text-foreground">Remote Mounts</div>
        <div className="text-xs text-muted-foreground">{mounts.length} active</div>
      </div>
      {mounts.length ? (
        <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {mounts.map((mount) => {
            const { localMount } = mount;
            const isUnmounting = localMount !== null && unmountingMountPoint === localMount;
            return (
              <div
                key={`${mount.remote}:${localMount || "nolocal"}`}
                className="flex items-center gap-2 rounded-[6px] border border-border/60 bg-background/50 px-2 py-1.5"
              >
                <span
                  className="w-16 shrink-0 truncate rounded-[4px] border border-border/60 bg-background/60 px-1.5 py-0.5 text-center text-[11px] tabular-nums text-muted-foreground"
                  title={localMount || "Ssh"}
                >
                  {formatRemoteMountBadgeLabel(localMount)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{formatRemoteMountTarget(mount)}</span>
                  <span className="block truncate text-xs text-muted-foreground" title={mount.remotePath || "/"}>
                    {mount.remotePath || "/"}
                  </span>
                </span>
                {localMount ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      tooltip="Choose repository here"
                      aria-label={`Choose a repository in ${formatRemoteMountTarget(mount)}`}
                      onClick={() => {
                        onClose();
                        void chooseProjectInMount(mount);
                      }}
                    >
                      <FolderOpen className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      tooltip="Unmount"
                      aria-label={`Unmount ${formatRemoteMountTarget(mount)}`}
                      disabled={isUnmounting}
                      onClick={() => {
                        void unmount(localMount);
                      }}
                    >
                      {isUnmounting ? <LoaderCircle className="size-4 animate-spin" /> : <Unplug className="size-4" />}
                    </Button>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[6px] border border-border/60 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
          No active SSH mounts.
        </div>
      )}
    </div>
  );
}
