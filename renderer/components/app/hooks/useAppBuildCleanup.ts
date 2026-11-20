import { useCallback, useRef, useState } from "react";
import { discardBuild } from "@/components/app/logic/apps/discardBuild";
import type { AppBuildCleanupStore } from "@/components/app/types/appBuildCleanup.types";

export function useAppBuildCleanup(store: AppBuildCleanupStore) {
  const pending = useRef(false);
  const [discarding, setDiscarding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const discard = useCallback(async (id: string) => {
    if (pending.current) return;
    pending.current = true;
    setDiscarding(id); setError(null);
    try { await discardBuild(store, id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The build could not be discarded."); }
    finally { pending.current = false; setDiscarding(null); void store.refresh(); }
  }, [store]);
  return { discard, discarding, error };
}
