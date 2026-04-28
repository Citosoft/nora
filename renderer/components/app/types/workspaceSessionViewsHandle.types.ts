/** Handle returned by `useWorkspaceSessionViews` (split-view grid + active view state). */
export type WorkspaceSessionViewsHandle = ReturnType<
  typeof import("@/components/app/hooks/useWorkspaceSessionViews").useWorkspaceSessionViews
>;
