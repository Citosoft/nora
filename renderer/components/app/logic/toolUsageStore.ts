import type { ToolUsageEntry, ToolUsageSnapshot, ToolUsageStore, ToolUsageStoreDeps } from "@/components/app/types/toolUsage.types";

const EMPTY_ENTRY: ToolUsageEntry = { info: null, loading: false, error: null, loadedAt: null };

/** One usage cache per app: concurrent and recent loads for a tool are shared instead of re-requested. */
export function createToolUsageStore({ fetchUsage, now, maxAgeMs }: ToolUsageStoreDeps): ToolUsageStore {
  let snapshot: ToolUsageSnapshot = {};
  const pending = new Map<string, Promise<void>>();
  const listeners = new Set<() => void>();
  const update = (toolId: string, patch: Partial<ToolUsageEntry>): void => {
    snapshot = { ...snapshot, [toolId]: { ...(snapshot[toolId] ?? EMPTY_ENTRY), ...patch } };
    for (const listener of [...listeners]) listener();
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    load(toolId, { force = false } = {}) {
      const inFlight = pending.get(toolId);
      if (inFlight) return inFlight;
      const loadedAt = snapshot[toolId]?.loadedAt ?? null;
      if (!force && loadedAt !== null && now() - loadedAt < maxAgeMs) return Promise.resolve();
      update(toolId, { loading: true });
      const work = Promise.resolve().then(() => fetchUsage(toolId)).then(
        (info) => { update(toolId, { info, error: null, loading: false, loadedAt: now() }); },
        (cause: unknown) => {
          update(toolId, { error: cause instanceof Error ? cause.message : "Unable to load usage.", loading: false, loadedAt: now() });
        }
      ).finally(() => { pending.delete(toolId); });
      pending.set(toolId, work);
      return work;
    }
  };
}
