import { useMemo } from "react";

/** Keeps one array per id set, so hooks keyed on it run when membership changes rather than on every render. */
export function useStableIds(ids: readonly string[]): readonly string[] {
  const key = ids.join("\n");
  return useMemo(() => (key ? key.split("\n") : []), [key]);
}
