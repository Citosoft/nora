import { importWorkspaces } from "@/components/app/logic/importWorkspaces";
import { useCallback, useEffect, useRef, useState } from "react";
import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import type { WorkspaceDiscoveryState, WorkspaceImportFailure, WorkspaceImportState } from "@/components/app/types/workspaceImport.types";

export function useOnboardingWorkspaceImport(open: boolean): WorkspaceImportState {
  const [discovery, setDiscovery] = useState<WorkspaceDiscoveryState>({ kind: "loading" });
  const [selected, setSelected] = useState<string[]>([]);
  const [imported, setImported] = useState<string[]>([]);
  const [failures, setFailures] = useState<WorkspaceImportFailure[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const generation = useRef(0);
  const importLock = useRef(false);

  const discover = useCallback(async () => {
    const request = ++generation.current;
    setDiscovery({ kind: "loading" });
    setSelected([]);
    setFailures([]);
    try {
      const result = await noraWorkspaceClient.discoverWorkspaces();
      if (request !== generation.current) return;
      setDiscovery({ kind: "ready", result });
      setSelected(result.workspaces.map((workspace) => workspace.path));
    } catch {
      if (request === generation.current) setDiscovery({ kind: "failed", message: "Could not discover existing projects. Retry or continue setup." });
    }
  }, []);

  useEffect(() => {
    if (open) {
      setImported([]);
      setFailures([]);
      void discover();
    }
    return () => { generation.current += 1; };
  }, [open, discover]);

  const importSelected = async () => {
    if (importLock.current) return;
    importLock.current = true;
    setIsImporting(true);
    setFailures([]);
    try {
      const errors = await importWorkspaces(selected, imported, {
        openProject: (path) => noraWorkspaceClient.selectProject(path),
        onImported: (path) => setImported((current) => [...current, path])
      });
      setFailures(errors);
    } finally {
      importLock.current = false;
      setIsImporting(false);
    }
  };

  return { discovery, selected, imported, failures, isImporting, discover, importSelected,
    selectAll: () => {
      if (discovery.kind === "ready") setSelected(discovery.result.workspaces.map((workspace) => workspace.path));
    },
    clearSelection: () => setSelected([]),
    toggle: (path: string) => setSelected((current) => current.includes(path) ? current.filter((entry) => entry !== path) : [...current, path])
  };
}
