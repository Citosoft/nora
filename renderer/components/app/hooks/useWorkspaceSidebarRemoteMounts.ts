import type { ActiveRemoteMount } from "@shared/appTypes";
import { useCallback, useEffect, useMemo, useState } from "react";

const REMOTE_MOUNTS_VISIBLE_LIMIT = 5;

export function useWorkspaceSidebarRemoteMounts({
  activeRemoteMounts,
  onChooseProjectAtPath,
  onUnmountRemoteMount
}: {
  activeRemoteMounts: ActiveRemoteMount[];
  onChooseProjectAtPath: (defaultPath: string, title?: string) => Promise<void>;
  onUnmountRemoteMount: (mountPoint: string) => Promise<unknown>;
}) {
  const [unmountingMountPoint, setUnmountingMountPoint] = useState<string | null>(null);
  const [remoteMountActionError, setRemoteMountActionError] = useState<string | null>(null);
  const [showAllRemoteMounts, setShowAllRemoteMounts] = useState(false);

  const visibleRemoteMounts = useMemo(
    () => (showAllRemoteMounts ? activeRemoteMounts : activeRemoteMounts.slice(0, REMOTE_MOUNTS_VISIBLE_LIMIT)),
    [activeRemoteMounts, showAllRemoteMounts]
  );
  const hiddenRemoteMountCount = Math.max(activeRemoteMounts.length - REMOTE_MOUNTS_VISIBLE_LIMIT, 0);

  useEffect(() => {
    if (activeRemoteMounts.length <= REMOTE_MOUNTS_VISIBLE_LIMIT && showAllRemoteMounts) {
      setShowAllRemoteMounts(false);
    }
  }, [activeRemoteMounts.length, showAllRemoteMounts]);

  const handleChooseProjectAtPath = useCallback(
    async (defaultPath: string, title?: string) => {
      setRemoteMountActionError(null);
      await onChooseProjectAtPath(defaultPath, title);
    },
    [onChooseProjectAtPath]
  );

  const handleUnmountRemoteMount = useCallback(
    async (mountPoint: string) => {
      setRemoteMountActionError(null);
      setUnmountingMountPoint(mountPoint);
      try {
        await onUnmountRemoteMount(mountPoint);
      } catch (error: unknown) {
        setRemoteMountActionError(error instanceof Error ? error.message : "Failed to unmount remote mount.");
      } finally {
        setUnmountingMountPoint((current) => (current === mountPoint ? null : current));
      }
    },
    [onUnmountRemoteMount]
  );

  return {
    handleChooseProjectAtPath,
    handleUnmountRemoteMount,
    hiddenRemoteMountCount,
    remoteMountActionError,
    setShowAllRemoteMounts,
    showAllRemoteMounts,
    unmountingMountPoint,
    visibleRemoteMounts
  };
}
