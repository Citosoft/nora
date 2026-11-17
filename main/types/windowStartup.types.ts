export interface WindowStartupDeps {
  hasWindow(): boolean;
  createWindow(): void;
  /** Shows, restores and focuses the existing window. */
  showWindow(): void;
}
