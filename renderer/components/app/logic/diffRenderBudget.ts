/** Row height of one diff line (`leading-6`), used to size placeholders for files that are not rendered. */
export const DIFF_LINE_HEIGHT_PX = 24;
/** Lines rendered per file before the viewer asks to show more, so one huge file cannot build tens of thousands of rows. */
export const DIFF_LINE_PAGE = 500;
/** How far beyond the visible area a file card renders its lines, so scrolling rarely reveals an empty card. */
export const DIFF_RENDER_MARGIN = "100% 0px";

/** Approximate body height of a file's first page of lines, before it has been rendered and measured. */
export function estimateDiffBodyHeight(diff: string): number {
  let lines = 1;
  for (let index = diff.indexOf("\n"); index !== -1 && lines < DIFF_LINE_PAGE; index = diff.indexOf("\n", index + 1)) lines++;
  return lines * DIFF_LINE_HEIGHT_PX;
}

/** Lines to show after one "show more" step; never past the total. */
export function nextDiffLinePage(visible: number, total: number): number {
  return Math.min(total, visible + DIFF_LINE_PAGE);
}
