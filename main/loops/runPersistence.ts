import type { LoopRun } from "@shared/appTypes";
import type { LoopPersistenceDeps, PendingLoopOutput } from "@main/types/loopPersistence.types";

/** Serialize the entire read/modify/write transaction, including user controls and streamed output. */
export function createLoopPersistence(deps: LoopPersistenceDeps) {
  const pendingOutputs = new Map<string, PendingLoopOutput>();
  const tails = new Map<string, Promise<void>>();
  function enqueue<T>(id: string, operation: () => Promise<T>): Promise<T> {
    pendingOutputs.delete(id);
    const result = (tails.get(id) ?? Promise.resolve()).then(operation);
    const tail = result.then(() => undefined, () => undefined);
    tails.set(id, tail);
    void tail.then(() => { if (tails.get(id) === tail) tails.delete(id); });
    return result;
  }
  async function write(run: LoopRun): Promise<LoopRun> {
    const bounded = { ...run, events: run.events.slice(-500) };
    await deps.store.saveRun(bounded);
    deps.notifyRunChanged(bounded);
    return bounded;
  }
  return {
    save(run: LoopRun): Promise<LoopRun> {
      const snapshot = structuredClone(run);
      return enqueue(run.id, async () => {
        const latest = await deps.store.getRun(run.projectId, run.id);
        if (latest && ["cancelled", "completed", "paused", "pausing"].includes(latest.status)) return latest;
        return write(snapshot);
      });
    },
    update(run: LoopRun, partial: Partial<LoopRun>): Promise<LoopRun> {
      const change = structuredClone(partial);
      return enqueue(run.id, async () => {
        const base = await deps.store.getRun(run.projectId, run.id) ?? run;
        if (base.status === "cancelled" || base.status === "completed") return base;
        if (base.status === "pausing" && change.status === "running") return base;
        const events = [...base.events];
        const seen = new Set(events.map((event) => event.id));
        for (const event of change.events ?? []) if (!seen.has(event.id)) { events.push(event); seen.add(event.id); }
        return write({ ...base, ...change, events, updatedAt: deps.nowIso() });
      });
    },
    output(run: LoopRun): Promise<void> {
      const { id, projectId, outputLog, outputEvents } = run;
      // The runner replaces its bounded event array on append. Capture those fields without retaining the full run.
      const snapshot = { outputLog, outputEvents };
      const pending = pendingOutputs.get(id);
      if (pending) {
        pending.snapshot = snapshot;
        return pending.written;
      }
      const written = enqueue(id, async () => {
        if (pendingOutputs.get(id) === batch) pendingOutputs.delete(id);
        const output = batch.snapshot;
        const latest = await deps.store.getRun(projectId, id);
        if (latest) await deps.store.saveRun({ ...latest, ...output });
      });
      const batch = { snapshot, written };
      pendingOutputs.set(id, batch);
      return written;
    }
  };
}
