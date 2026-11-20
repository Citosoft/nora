import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { AboutUpdateStatusState } from "@/components/app/types/aboutDialog.types";
import { APP_VERSION } from "@shared/appMeta";
import type { ReleaseVersionStatus } from "@shared/appTypes";
import { useEffect, useState } from "react";

/** Re-checks the release status (and local updater test support) each time the About dialog opens. */
export function useAboutUpdateStatus(open: boolean): AboutUpdateStatusState {
  const [status, setStatus] = useState<ReleaseVersionStatus | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [autoUpdateTestingEnabled, setAutoUpdateTestingEnabled] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let mounted = true;
    setHasChecked(false);
    setStatus(null);

    noraSystemClient.getReleaseVersionStatus().then((nextStatus) => {
      if (mounted) {
        setStatus(nextStatus);
        setHasChecked(true);
      }
    }).catch((error: unknown) => {
      if (mounted) {
        setStatus({
          kind: "error",
          currentVersion: APP_VERSION,
          message: error instanceof Error ? error.message : "Unable to check for updates.",
          releaseUrl: ""
        });
        setHasChecked(true);
      }
    });

    noraSystemClient.getAutoUpdateTestSupport().then((support) => {
      if (mounted) {
        setAutoUpdateTestingEnabled(support.enabled);
      }
    }).catch(() => {
      if (mounted) {
        setAutoUpdateTestingEnabled(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [open]);

  return { status, hasChecked, autoUpdateTestingEnabled };
}
