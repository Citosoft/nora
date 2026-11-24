import { useEffect } from "react";
import { router } from "expo-router";
import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import { routes } from "@/navigation/routes";

/** Per app launch: when "Open at launch" names a computer, the first visit home jumps to it; going back lands on the dashboard. */
let openedThisLaunch = false;

export function useOpenDefaultRuntimeOnce(defaultRuntimeId: string | null, runtimes: readonly RuntimeDirectoryEntry[] | null): void {
  useEffect(() => {
    if (openedThisLaunch || !runtimes) return;
    openedThisLaunch = true;
    const preferred = defaultRuntimeId ? runtimes.find((runtime) => runtime.installationId === defaultRuntimeId) : undefined;
    if (preferred) router.push(routes.runtime(preferred.installationId));
  }, [defaultRuntimeId, runtimes]);
}
