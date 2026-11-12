import { createProviderUpdateEntries, selectDismissedNotices, setProviderUpdateStatus } from "@/components/app/logic/providerUpdateEntries";
import { buildProviderUpdateToast } from "@/components/app/logic/providerUpdateToast";
import type {
  ProviderUpdateEntry,
  UseProviderUpdateToastsArgs,
  UseProviderUpdateToastsResult
} from "@/components/app/types/providerUpdateToasts.types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Checks provider CLIs once per app launch and stacks one toast per outdated provider. Providers whose
 * toast is dismissed without updating stay listed for the sidebar indicator until this launch ends.
 */
export function useProviderUpdateToasts({
  checkProviderUpdates,
  showToast,
  dismissToast,
  updateProvider
}: UseProviderUpdateToastsArgs): UseProviderUpdateToastsResult {
  const [entries, setEntries] = useState<ProviderUpdateEntry[]>([]);
  const hasCheckedRef = useRef(false);
  // Read through a ref so a changing install callback neither re-runs the check nor goes stale in a toast.
  const updateProviderRef = useRef(updateProvider);
  updateProviderRef.current = updateProvider;

  const startUpdate = useCallback((toolId: string): void => {
    setEntries((current) => setProviderUpdateStatus(current, toolId, "updating"));
    void updateProviderRef.current(toolId);
  }, []);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    // Start inside the promise chain so a synchronous bridge failure is caught like a rejected check.
    void Promise.resolve()
      .then(() => checkProviderUpdates())
      .then((notices) => {
        setEntries(createProviderUpdateEntries(notices));
        for (const notice of notices) {
          const toastId = showToast({
            ...buildProviderUpdateToast(notice, () => {
              dismissToast(toastId);
              startUpdate(notice.toolId);
            }),
            // Fires for the dismiss button, swipe and auto-close, but not for the Update action above.
            onDismissed: () => setEntries((current) => setProviderUpdateStatus(current, notice.toolId, "dismissed"))
          });
        }
      })
      .catch((error: unknown) => {
        // A failed check only means no notices; it must never interrupt startup.
        console.warn("[nora renderer] provider update check failed", error);
      });
  }, [checkProviderUpdates, dismissToast, showToast, startUpdate]);

  const dismissedNotices = useMemo(() => selectDismissedNotices(entries), [entries]);
  return { dismissedNotices, updateProvider: startUpdate };
}
