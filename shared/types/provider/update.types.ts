/** A detected provider CLI whose installed version is behind its published release. */
export interface ProviderUpdateNotice {
  /** Agent catalog id, e.g. `claude` or `codex`. */
  toolId: string;
  label: string;
  installedVersion: string;
  latestVersion: string;
}
