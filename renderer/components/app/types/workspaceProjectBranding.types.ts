export type WorkspaceProjectBranding = {
  /** Local favicon data URL, or the homepage's favicon when the project has none. */
  faviconUrl: string | null;
  /** Normalized `homepage` from the project's `package.json`. */
  homepageUrl: string | null;
};
