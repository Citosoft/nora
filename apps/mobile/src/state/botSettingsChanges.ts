/** Local saves also refresh mounted bot pickers and persistent sidebars on the same computer. */
const listeners = new Map<string, Set<() => void>>();

export function subscribeToBotChanges(runtimeId: string, listener: () => void): () => void {
  const subscriptions = listeners.get(runtimeId) ?? new Set<() => void>();
  listeners.set(runtimeId, subscriptions);
  subscriptions.add(listener);
  return () => {
    subscriptions.delete(listener);
    if (!subscriptions.size) listeners.delete(runtimeId);
  };
}

export function notifyBotsChanged(runtimeId: string): void {
  for (const listener of listeners.get(runtimeId) ?? []) listener();
}
