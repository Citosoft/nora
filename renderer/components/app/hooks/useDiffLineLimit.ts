import { useCallback, useState } from "react";
import { DIFF_LINE_PAGE, nextDiffLinePage } from "@/components/app/logic/diffRenderBudget";
import type { DiffLineLimit } from "@/components/app/types/diffLine.types";

/**
 * How many lines of one file's diff to render. Held by the file's owner rather than the line list, so a card that
 * unmounts while scrolled away comes back at the same length; switching to another file starts from one page again.
 */
export function useDiffLineLimit(fileKey: string): DiffLineLimit {
  const [state, setState] = useState({ fileKey, limit: DIFF_LINE_PAGE });
  const limit = state.fileKey === fileKey ? state.limit : DIFF_LINE_PAGE;
  const showMore = useCallback((total: number) => setState({ fileKey, limit: nextDiffLinePage(limit, total) }), [fileKey, limit]);
  const showAll = useCallback((total: number) => setState({ fileKey, limit: total }), [fileKey]);
  return { limit, showMore, showAll };
}
