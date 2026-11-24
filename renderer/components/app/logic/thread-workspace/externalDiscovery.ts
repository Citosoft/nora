import type { ExternalDiscoveryState, ExternalDiscoveryStore, ExternalDiscoveryStoreDeps, ExternalDiscoveryTarget, ExternalSessionEntry } from "@/components/app/types/externalSessions.types";

interface TargetResult { entries: ExternalSessionEntry[]; error: string | null; }

export function externalDiscoveryKey({ workspace, provider }: ExternalDiscoveryTarget): string {
  return `${workspace.id}\u0000${provider.kind}\u0000${provider.instanceId}`;
}

/**
 * Scanning provider history on disk is slow and reorders the thread list, so results are kept for the window's lifetime:
 * each target is scanned once, and again only on an explicit refresh.
 */
export function createExternalDiscoveryStore({ client }: ExternalDiscoveryStoreDeps): ExternalDiscoveryStore {
  const results = new Map<string, TargetResult>();
  /** Latest request per target, so a slower earlier scan never overwrites a newer one. */
  const pending = new Map<string, number>();
  const listeners = new Set<() => void>();
  let sequence = 0;
  let state: ExternalDiscoveryState = { entries: [], loading: false, errors: [] };
  const publish = (): void => {
    const values = [...results.values()];
    state = { entries: values.flatMap((result) => result.entries), loading: pending.size > 0,
      errors: [...new Set(values.flatMap((result) => result.error ? [result.error] : []))] };
    for (const listener of listeners) listener();
  };
  const scan = async (target: ExternalDiscoveryTarget): Promise<TargetResult> => {
    const { workspace, provider } = target;
    try {
      const result = await client.externalSessions(provider.kind, provider.instanceId, workspace.workspace);
      return result.status === "available"
        ? { error: null, entries: result.sessions.map((session) => ({ session, workspaceId: workspace.id, workspaceName: workspace.name, workspacePath: workspace.workspace.path })) }
        : { entries: [], error: result.message };
    } catch (cause) { return { entries: [], error: cause instanceof Error ? cause.message : "External sessions could not be loaded." }; }
  };
  const load = (targets: readonly ExternalDiscoveryTarget[]): void => {
    if (!targets.length) return;
    for (const target of targets) {
      const key = externalDiscoveryKey(target); const id = ++sequence;
      pending.set(key, id);
      void scan(target).then((result) => {
        if (pending.get(key) !== id) return;
        pending.delete(key); results.set(key, result); publish();
      });
    }
    publish();
  };
  return {
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    snapshot: () => state,
    ensure(targets) { load(targets.filter((target) => { const key = externalDiscoveryKey(target); return !results.has(key) && !pending.has(key); })); },
    refresh(targets) { load(targets); }
  };
}
