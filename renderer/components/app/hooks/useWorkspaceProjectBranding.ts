import { resolveWorkspaceProjectBranding } from "@/components/app/logic/workspaceProjectBranding";
import type { WorkspaceProjectBranding } from "@/components/app/types/workspaceProjectBranding.types";
import { useEffect, useState } from "react";

const EMPTY_BRANDING: WorkspaceProjectBranding = { faviconUrl: null, homepageUrl: null };

export function useWorkspaceProjectBranding(
  projectId: string | null,
  rootPath: string | null
): WorkspaceProjectBranding {
  const [branding, setBranding] = useState<WorkspaceProjectBranding>(EMPTY_BRANDING);

  useEffect(() => {
    let isDisposed = false;
    if (!projectId || !rootPath) {
      setBranding(EMPTY_BRANDING);
      return () => {
        isDisposed = true;
      };
    }
    void resolveWorkspaceProjectBranding(projectId, rootPath).then((resolved) => {
      if (isDisposed) {
        return;
      }
      setBranding(resolved);
    });
    return () => {
      isDisposed = true;
    };
  }, [projectId, rootPath]);

  return branding;
}
