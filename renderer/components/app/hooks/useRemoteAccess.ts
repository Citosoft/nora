import { useCallback, useEffect, useRef, useState } from "react";
import { remoteAccessClient } from "@/components/app/clients/remoteAccessClient";
import type { RemoteAccessControls } from "@/components/app/types/remoteAccess.types";
import type { RemoteAccessViewRequest } from "@shared/ipc/types/remoteAccessGateway.types";
import type { RemoteAccessView, RemoteAuditEntry } from "@shared/types/remote-access/remoteAccess.types";

export function useRemoteAccess(): RemoteAccessControls {
  const [view, setView] = useState<RemoteAccessView | null>(null);
  const [activity, setActivity] = useState<RemoteAuditEntry[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const mounted = useRef(false);
  const busy = useRef(false);
  const revision = useRef(0);
  const activityRevision = useRef(0);

  const refreshActivity = useCallback(async () => {
    const version = ++activityRevision.current;
    try {
      const entries = await remoteAccessClient.activity(20);
      if (mounted.current && version === activityRevision.current) {
        setActivity(entries); setActivityError(null);
      }
    } catch (cause) {
      if (mounted.current && version === activityRevision.current) setActivityError(cause instanceof Error ? cause.message : "Could not load remote activity.");
    }
  }, []);

  const request = useCallback(async (input: RemoteAccessViewRequest): Promise<boolean> => {
    if (busy.current) return false;
    busy.current = true; setPending(true); setError(null);
    const version = revision.current;
    try {
      const next = await remoteAccessClient.request(input);
      if (mounted.current && revision.current === version) setView(next);
      return true;
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "Could not update remote access.");
      return false;
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    const version = revision.current;
    const unsubscribe = remoteAccessClient.onChanged((next) => {
      revision.current += 1; setView(next);
    });
    void remoteAccessClient.request({ kind: "view" }).then((next) => {
      if (active && revision.current === version) setView(next);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Could not load remote access.");
    });
    void refreshActivity();
    return () => { active = false; mounted.current = false; unsubscribe(); };
  }, [refreshActivity]);

  return { view, activity, pending, error, activityError, request, refreshActivity };
}
