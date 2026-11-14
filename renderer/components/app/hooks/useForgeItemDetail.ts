import { useCallback, useEffect, useRef, useState } from "react";
import type { ItemDetailInput, ItemDetailSnapshot } from "@/components/app/types/forge-items/list.types";

/** Cache a row's loaded details across collapse; a changed item revision loads fresh details. */
export function useForgeItemDetail({ identity, enabled, read }: ItemDetailInput) {
  const [snapshot, setSnapshot] = useState<ItemDetailSnapshot>({ identity, state: { status: "unavailable" } });
  const current = useRef(snapshot);
  const generation = useRef(0);
  const load = useCallback(async (force = false): Promise<void> => {
    const cached = current.current;
    if (!force && cached.identity === identity && cached.state.status !== "unavailable") return;
    const request = ++generation.current;
    const pending: ItemDetailSnapshot = { identity, state: { status: "loading" } };
    current.current = pending;
    setSnapshot(pending);
    try {
      const detail = await read();
      if (generation.current !== request) return;
      const ready: ItemDetailSnapshot = { identity, state: { status: "ready", value: detail } };
      current.current = ready;
      setSnapshot(ready);
    } catch (cause) {
      if (generation.current !== request) return;
      const failed: ItemDetailSnapshot = { identity, state: { status: "failed", message: cause instanceof Error ? cause.message : "The item details could not be loaded." } };
      current.current = failed;
      setSnapshot(failed);
    }
  }, [identity, read]);
  useEffect(() => { if (enabled) void load(); }, [enabled, load]);
  return {
    state: snapshot.identity === identity ? snapshot.state : { status: "unavailable" as const },
    retry: () => { void load(true); }
  };
}
