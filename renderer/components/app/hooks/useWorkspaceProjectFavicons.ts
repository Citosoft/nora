import { resolveWorkspaceProjectBranding } from "@/components/app/logic/workspaceProjectBranding";
import type { WorkspaceSummary } from "@shared/appTypes";
import { useEffect, useMemo, useState } from "react";

export function useWorkspaceProjectFavicons(workspaces: WorkspaceSummary[]): Record<string, string> {
  const [faviconByProjectId, setFaviconByProjectId] = useState<Record<string, string>>({});
  const workspaceLookupKey = useMemo(
    () => workspaces.map((workspace) => `${workspace.project.id}:${workspace.project.rootPath}`).join("|"),
    [workspaces]
  );

  useEffect(() => {
    let isDisposed = false;
    const missingProjects = workspaces.filter((workspace) => !faviconByProjectId[workspace.project.id]);
    if (missingProjects.length === 0) {
      return () => {
        isDisposed = true;
      };
    }

    void Promise.all(
      missingProjects.map(async (workspace) => {
        const { faviconUrl } = await resolveWorkspaceProjectBranding(workspace.project.id, workspace.project.rootPath);
        return {
          projectId: workspace.project.id,
          faviconUrl
        };
      })
    ).then((results) => {
      if (isDisposed) {
        return;
      }
      const updates = results
        .filter((entry): entry is { projectId: string; faviconUrl: string } => typeof entry.faviconUrl === "string" && entry.faviconUrl.length > 0)
        .reduce<Record<string, string>>((accumulator, entry) => {
          accumulator[entry.projectId] = entry.faviconUrl;
          return accumulator;
        }, {});
      if (Object.keys(updates).length === 0) {
        return;
      }
      setFaviconByProjectId((current) => ({ ...current, ...updates }));
    });

    return () => {
      isDisposed = true;
    };
  }, [faviconByProjectId, workspaceLookupKey, workspaces]);

  return faviconByProjectId;
}
