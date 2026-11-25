/**
 * Offset from the start of the title bar's middle region to the content column's left edge.
 * Zero when the column starts under the title bar's own controls, such as with the sidebar collapsed.
 */
export function resolveTitleBarContentInset(contentLeft: number, regionLeft: number): number {
  return Math.max(0, Math.round(contentLeft - regionLeft));
}
