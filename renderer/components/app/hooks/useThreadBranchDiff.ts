import { useCallback, useState } from "react";
import { useThreadRead } from "@/components/app/hooks/useThreadRead";
import type { ThreadBranchDiffTarget } from "@/components/app/types/centerDiff.types";
import type { ThreadForgeClient } from "@/components/app/types/threadForge.types";

/** Loads a thread branch's per-file patches for the center diff viewer, refreshable on demand. */
export function useThreadBranchDiff(forge: ThreadForgeClient | null, target: ThreadBranchDiffTarget) {
  const [revision, setRevision] = useState(0);
  const identity = forge ? JSON.stringify([target.projectId, target.checkoutPath]) : "";
  const diff = useThreadRead(forge ? () => forge.readBranchDiff(target.projectId, target.checkoutPath) : null,
    identity, String(revision), "The branch diff could not be loaded.");
  const refresh = useCallback(() => setRevision((current) => current + 1), []);
  return { diff, refresh };
}
