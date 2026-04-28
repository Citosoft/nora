import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import type { WorkspaceSummary } from "@shared/appTypes";
import { useEffect, useMemo, useState } from "react";

const PROJECT_FAVICON_CANDIDATE_PATHS: readonly string[] = [
  "favicon.ico",
  "favicon.png",
  "favicon.svg",
  "public/favicon.ico",
  "public/favicon.png",
  "public/favicon.svg",
  "src/favicon.ico",
  "src/favicon.png",
  "src/favicon.svg",
  "app/favicon.ico",
  "app/favicon.png",
  "app/favicon.svg"
];

async function resolveProjectFaviconDataUrl(
  projectId: string,
  rootPath: string
): Promise<string | null> {
  for (const candidatePath of PROJECT_FAVICON_CANDIDATE_PATHS) {
    try {
      const stat = await noraWorkspaceClient.statWorkspacePath({
        projectId,
        rootPath,
        path: candidatePath
      });
      if (!stat.exists || stat.kind !== "file") {
        continue;
      }
      const image = await noraWorkspaceClient.readWorkspaceImageFile({
        projectId,
        rootPath,
        path: candidatePath
      });
      if (image.dataUrl.trim().length > 0) {
        return image.dataUrl;
      }
    } catch {
      continue;
    }
  }
  return null;
}

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
        const dataUrl = await resolveProjectFaviconDataUrl(workspace.project.id, workspace.project.rootPath);
        return {
          projectId: workspace.project.id,
          dataUrl
        };
      })
    ).then((results) => {
      if (isDisposed) {
        return;
      }
      const updates = results
        .filter((entry): entry is { projectId: string; dataUrl: string } => typeof entry.dataUrl === "string" && entry.dataUrl.length > 0)
        .reduce<Record<string, string>>((accumulator, entry) => {
          accumulator[entry.projectId] = entry.dataUrl;
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

export function useWorkspaceProjectFavicon(
  projectId: string | null,
  rootPath: string | null
): string | null {
  const [faviconDataUrl, setFaviconDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let isDisposed = false;
    if (!projectId || !rootPath) {
      setFaviconDataUrl(null);
      return () => {
        isDisposed = true;
      };
    }
    void resolveProjectFaviconDataUrl(projectId, rootPath).then((dataUrl) => {
      if (isDisposed) {
        return;
      }
      setFaviconDataUrl(dataUrl);
    });
    return () => {
      isDisposed = true;
    };
  }, [projectId, rootPath]);

  return faviconDataUrl;
}
