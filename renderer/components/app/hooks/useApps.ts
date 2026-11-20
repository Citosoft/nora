import { useCallback, useEffect, useMemo, useState } from "react";
import { appsClient } from "@/components/app/clients/appsClient";
import type { AppSummary } from "@shared/types/apps/apps.types";
import type { AppsClient, AppsList } from "@/components/app/types/apps.types";

const errorText = (error: unknown, fallback: string): string => error instanceof Error && error.message ? error.message : fallback;

/** Every app, as main lists it; replies and change notifications both carry the whole list. */
export function useApps(client: AppsClient = appsClient): AppsList {
  const [apps, setApps] = useState<readonly AppSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const unsubscribe = client.onChanged((next) => { if (active) setApps(next); });
    client.request({ kind: "list" }).then((reply) => { if (active && reply.kind === "apps") { setApps(reply.apps); setError(null); } },
      (cause: unknown) => { if (active) setError(errorText(cause, "Apps could not be loaded.")); });
    return () => { active = false; unsubscribe(); };
  }, [client]);
  const run = useCallback(async (request: Parameters<AppsClient["request"]>[0]) => {
    const reply = await client.request(request);
    if (reply.kind === "apps") setApps(reply.apps);
  }, [client]);
  return useMemo<AppsList>(() => ({ apps, error,
    rename: (id, name) => run({ kind: "rename", id, name }),
    setTrusted: (id, trusted) => run({ kind: "set-trusted", id, trusted }),
    remove: (id) => run({ kind: "delete", id }),
    exportToFile: async (id) => { const reply = await client.request({ kind: "export", id }); return reply.kind === "exported" ? reply.path : null; },
    pickImport: async () => { const reply = await client.request({ kind: "pick-import" }); return reply.kind === "app-file" ? { path: reply.path, file: reply.file } : null; },
    importFile: async (workspaceId, file, connectorIds) => {
      const reply = await client.request({ kind: "import", workspaceId, file, connectorIds: { ...connectorIds } });
      if (reply.kind !== "app") throw new Error("The app could not be imported.");
      return reply.app;
    } }), [apps, error, run, client]);
}
