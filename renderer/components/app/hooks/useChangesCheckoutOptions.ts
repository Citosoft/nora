import { useMemo } from "react";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useThreadCenterPorts } from "@/components/app/hooks/useThreadCenterPorts";
import { buildChangesCheckoutOptions } from "@/components/app/logic/changesCheckoutOptions";
import type { ChangesCheckoutOption } from "@/components/app/types/changesCheckout.types";

/** Checkouts the Changes panel can show, annotated with the threads working in each. */
export function useChangesCheckoutOptions(): ChangesCheckoutOption[] {
  const snapshot = useCanonicalAppSnapshot();
  const { state } = useThreadCenterPorts();
  const project = snapshot?.project ?? null;
  const worktrees = snapshot?.worktrees;
  const changesRoot = snapshot?.changesRoot ?? null;
  return useMemo(
    () => (worktrees ? buildChangesCheckoutOptions({ project, worktrees, changesRoot }, state.summaries) : []),
    [project, worktrees, changesRoot, state.summaries]
  );
}
