import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import type {
  UseWorkspaceSetupScriptsDraftArgs,
  UseWorkspaceSetupScriptsDraftResult
} from "@/components/app/types/workspaceSetupScripts.types";
import type { WorkspaceSetupScript } from "@shared/appTypes";
import { useCallback, useEffect, useState } from "react";

const NO_SCRIPTS: WorkspaceSetupScript[] = [];

/** Editable copy of a workspace's setup scripts, reset whenever the editor opens. */
export function useWorkspaceSetupScriptsDraft({ open, project }: UseWorkspaceSetupScriptsDraftArgs): UseWorkspaceSetupScriptsDraftResult {
  const saved = project?.workspaceSetupScripts ?? NO_SCRIPTS;
  const [scripts, setScripts] = useState<WorkspaceSetupScript[]>(saved);
  const [saveError, setSaveError] = useState<string | null>(null);

  const projectId = project?.id ?? null;
  // Reset only when the editor opens or switches workspace, so state refreshes never discard edits in progress.
  useEffect(() => {
    if (open) {
      setScripts(saved);
      setSaveError(null);
    }
  }, [open, projectId]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!project || scripts === saved) {
      return true;
    }
    try {
      await noraWorkspaceClient.saveWorkspaceSetupScripts(project.id, scripts);
      setSaveError(null);
      return true;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Setup scripts could not be saved.");
      return false;
    }
  }, [project, saved, scripts]);

  return { scripts, setScripts, save, saveError };
}
