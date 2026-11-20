import { useCallback, useEffect, useMemo, useState } from "react";
import { canInstallAppConnector, matchAppFileConnectors } from "@shared/apps/portable";
import type { PickedAppFile } from "@shared/types/apps/portable.types";
import type { AppImport } from "@/components/app/types/appsView.types";
import type { NewAppDraft } from "@/components/app/types/appsView.types";
import { useApps } from "./useApps";

const errorText = (error: unknown, fallback: string): string => error instanceof Error && error.message ? error.message : fallback;

/**
 * Importing an app file into the draft's workspace. Each connector the file names is matched to a local one by server URL, and the
 * match is redone whenever the workspace's connectors change, so adding the missing one from the gallery completes the import.
 */
export function useAppImport(draft: NewAppDraft, onOpen: (appId: string) => void, initialFile: PickedAppFile | null = null): AppImport {
  const apps = useApps();
  const [picked, setPicked] = useState<PickedAppFile | null>(initialFile);
  const [overrides, setOverrides] = useState<Readonly<Record<string, string | null>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { available, workspace } = draft;
  const matches = useMemo(() => picked ? matchAppFileConnectors(picked.file, available) : {}, [picked, available]);
  const choices = useMemo(() => ({ ...matches, ...overrides }), [matches, overrides]);
  useEffect(() => { setOverrides({}); setError(null); }, [picked, workspace?.id]);

  const start = useCallback(() => {
    setBusy(true); setError(null);
    apps.pickImport().then((next) => { if (next) setPicked(next); }, (cause: unknown) => setError(errorText(cause, "The file could not be read."))).finally(() => setBusy(false));
  }, [apps]);
  const confirm = useCallback(() => {
    if (!picked || busy) return;
    if (!workspace) { setError("Open a workspace first: an app uses the connectors available there."); return; }
    const connectorIds: Record<string, string> = {};
    for (const [fileId, localId] of Object.entries(choices)) { if (localId) connectorIds[fileId] = localId; else if (!picked.file.connectors[fileId] || !canInstallAppConnector(picked.file.connectors[fileId])) { setError("Choose a connector for each one that needs manual setup."); return; } }
    setBusy(true); setError(null);
    apps.importFile(workspace.id, picked.file, connectorIds).then((app) => { setPicked(null); onOpen(app.id); },
      (cause: unknown) => setError(errorText(cause, "The app could not be imported."))).finally(() => setBusy(false));
  }, [picked, busy, workspace, choices, apps, onOpen]);

  return useMemo<AppImport>(() => ({ picked, choices, choose: (fileId, localId) => setOverrides((current) => ({ ...current, [fileId]: localId })),
    busy, error, start, confirm, cancel: () => setPicked(null) }), [picked, choices, busy, error, start, confirm]);
}
