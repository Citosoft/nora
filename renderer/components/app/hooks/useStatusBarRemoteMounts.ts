import { noraWorkspaceManagementClient } from "@/components/app/clients/noraWorkspaceManagementClient";
import { useOptionalWorkspaceSidebarPorts } from "@/components/app/context/workspaceSidebarPortsContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import type { StatusBarRemoteMountsModel } from "@/components/app/types/statusBarRemoteMounts.types";
import { useCallback, useMemo, useState } from "react";

/** Returns null outside the signed-in shell (loading / onboarding footers), where mounts cannot be acted on. */
export const useStatusBarRemoteMounts = (): StatusBarRemoteMountsModel | null => {
  const sidebarBuild = useOptionalWorkspaceSidebarPorts()?.sidebarBuild ?? null;
  const mounts = useCanonicalAppSnapshot()?.activeRemoteMounts;
  const [unmountingMountPoint, setUnmountingMountPoint] = useState<string | null>(null);
  const safely = sidebarBuild?.safely;
  const chooseWorkspaceAtPath = sidebarBuild?.handleChooseWorkspaceAtPath;

  const unmount = useCallback(
    async (mountPoint: string) => {
      if (!safely) {
        return;
      }
      setUnmountingMountPoint(mountPoint);
      try {
        // `safely` routes failures through the shared error dialog.
        await safely(() => noraWorkspaceManagementClient.unmountRemoteMount(mountPoint));
      } finally {
        setUnmountingMountPoint((current) => (current === mountPoint ? null : current));
      }
    },
    [safely]
  );

  return useMemo(() => {
    if (!chooseWorkspaceAtPath) {
      return null;
    }
    return {
      mounts: mounts ?? [],
      unmountingMountPoint,
      chooseProjectInMount: async (mount) => {
        if (!mount.localMount) {
          return;
        }
        await chooseWorkspaceAtPath(mount.localMount, `Choose a repository in ${mount.host || mount.remote}`);
      },
      unmount
    };
  }, [chooseWorkspaceAtPath, mounts, unmount, unmountingMountPoint]);
};
