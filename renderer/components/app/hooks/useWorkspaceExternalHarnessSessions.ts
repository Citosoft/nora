import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import type { ExternalHarnessSessionSummary } from "@shared/appTypes";
import { useEffect, useState } from "react";

type UseWorkspaceExternalHarnessSessionsOptions = {
  enabled?: boolean;
  reloadToken?: number;
};

export const useWorkspaceExternalHarnessSessions = (
  projectId: string | null,
  rootPath: string | null | undefined,
  options?: UseWorkspaceExternalHarnessSessionsOptions
): { sessions: ExternalHarnessSessionSummary[]; isLoading: boolean } => {
  const enabled = options?.enabled !== false;
  const [sessions, setSessions] = useState<ExternalHarnessSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    if (!projectId || !rootPath) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    void noraWorkspaceClient
      .listExternalHarnessContextSessions(projectId, rootPath)
      .then((next) => {
        if (cancelled) {
          return;
        }
        setSessions(next);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setSessions([]);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, rootPath, enabled, options?.reloadToken]);

  return { sessions, isLoading };
};
