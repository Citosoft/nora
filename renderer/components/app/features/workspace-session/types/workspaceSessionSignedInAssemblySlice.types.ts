import type { WorkspaceSessionViewsHandle } from "@/components/app/types/workspaceSessionViewsHandle.types";
import type { AppShellSignedInSessionSurfaceSources } from "@/components/app/types/appShellSignedInAssemblySources.types";

/** Session center/split-view surface: everything except fields derived from `workspaceSessionViews` grid helpers. */
export type WorkspaceSessionSurfaceSignedInSliceInput = Omit<
  AppShellSignedInSessionSurfaceSources,
  "activeGridColumns" | "activeGridRows" | "activeView" | "workspaceSessionViews"
> & {
  workspaceSessionViews: WorkspaceSessionViewsHandle;
};
