import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { UseLinuxUpdateNoticeResult } from "@/components/app/types/component.types";
import type { LinuxUpdateStatus } from "@shared/appTypes";
import { useEffect, useState } from "react";

export function useLinuxUpdateNotice(): UseLinuxUpdateNoticeResult {
  const [linuxUpdateStatus, setLinuxUpdateStatus] = useState<Extract<LinuxUpdateStatus, { kind: "available" }> | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;

    noraSystemClient.getLinuxUpdateStatus().then((status) => {
      if (!mounted) {
        return;
      }

      setLinuxUpdateStatus(status.kind === "available" ? status : null);
    }).catch(() => {
      if (!mounted) {
        return;
      }

      setLinuxUpdateStatus(null);
    });

    return () => {
      mounted = false;
    };
  }, []);

  return {
    linuxUpdateStatus: isDismissed ? null : linuxUpdateStatus,
    dismissLinuxUpdateNotice: () => setIsDismissed(true)
  };
}
