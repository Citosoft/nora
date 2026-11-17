import { useCallback, useEffect, useState } from "react";
import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import type { RuntimeReachability } from "@/types/reachability.types";
import { subscribeToForeground } from "@/platform/foregroundSignals";
import { useRemoteAccess } from "./useRemoteAccess";

/** Probes the runtime directly (never trusting registration), again on demand and when the app returns to the foreground. */
export function useRuntimeReachability(entry: RuntimeDirectoryEntry): { reachability: RuntimeReachability; recheck: () => void } {
  const services = useRemoteAccess();
  const [reachability, setReachability] = useState<RuntimeReachability>({ status: "checking" });
  const [attempt, setAttempt] = useState(0);
  const recheck = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setReachability({ status: "checking" });
    void services.probe(entry.hostname).then((result) => {
      if (cancelled) return;
      setReachability(result);
      if (result.status === "online") services.recordConnected(entry.installationId, new Date(result.checkedAt));
    });
    return () => {
      cancelled = true;
    };
  }, [attempt, entry.hostname, entry.installationId, services]);

  useEffect(() => subscribeToForeground(recheck), [recheck]);
  return { reachability, recheck };
}
