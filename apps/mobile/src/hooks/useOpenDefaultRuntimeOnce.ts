import { useEffect } from "react";
import { router } from "expo-router";
import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import { routes } from "@/navigation/routes";

/** Per app launch: the first visit to the home screen jumps to the default computer; returning "back" stays on the list. */
let openedThisLaunch = false;

export function useOpenDefaultRuntimeOnce(defaultRuntimeId: string | null, runtimes: readonly RuntimeDirectoryEntry[] | null): void {
  useEffect(() => {
    if (openedThisLaunch || !runtimes) return;
    openedThisLaunch = true;
    const preferred = runtimes.find((runtime) => runtime.installationId === defaultRuntimeId) ?? (runtimes.length === 1 ? runtimes[0] : null);
    if (preferred) router.push(routes.runtime(preferred.installationId));
  }, [defaultRuntimeId, runtimes]);
}
