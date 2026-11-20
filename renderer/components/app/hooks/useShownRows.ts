import { useEffect, useState } from "react";
import type { AppRow } from "@/components/app/types/apps.types";
import type { ShownRows } from "@/components/app/types/appsComponents.types";

/** The first `pageSize` rows, growing by a page each time the user asks; everything when no page size is set. Resets when the rows change size. */
export function useShownRows(rows: readonly AppRow[], pageSize: number | undefined): ShownRows {
  const [shown, setShown] = useState(pageSize ?? Number.POSITIVE_INFINITY);
  useEffect(() => { setShown(pageSize ?? Number.POSITIVE_INFINITY); }, [pageSize, rows.length]);
  const visible = pageSize ? rows.slice(0, shown) : rows;
  return { rows: visible, hidden: rows.length - visible.length, showMore: () => setShown((current) => current + (pageSize ?? 0)) };
}
