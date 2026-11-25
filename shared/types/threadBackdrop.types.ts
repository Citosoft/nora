/** Which threads draw the animated pixel terrain behind them. */
export type ThreadBackdropScope = "new" | "all";

export interface ThreadBackdropSettings {
  animated: boolean;
  /** Kept while `animated` is off so turning it back on restores the previous choice. */
  scope: ThreadBackdropScope;
}
