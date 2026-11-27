import type { ExecutionProvider } from "@main/types/execution/provider.types";
import type { ProviderSupervisor } from "@main/types/execution/host.types";
import type { FollowUpListener, ProviderFollowUp } from "@main/types/execution/followUp.types";
import type { BackgroundTasksListener, ProviderBackgroundTasks } from "@main/types/execution/backgroundTasks.types";
import { ExecutionCommandError } from "./errors";

export class ProviderRegistry implements ProviderSupervisor {
  private readonly providers = new Map<string, ExecutionProvider>();
  private readonly followUpListeners = new Set<FollowUpListener>();
  private readonly followUpSubscriptions: (() => void)[] = [];
  private readonly backgroundTaskListeners = new Set<BackgroundTasksListener>();
  private readonly backgroundTaskSubscriptions: (() => void)[] = [];

  register(provider: ExecutionProvider): void {
    const key = JSON.stringify([provider.kind, provider.instanceId]);
    if (this.providers.has(key)) throw new ExecutionCommandError("conflict", "Provider instance is already registered");
    this.providers.set(key, provider);
    if (provider.followUps) this.followUpSubscriptions.push(provider.followUps.subscribe((followUp) => this.deliverFollowUp(followUp)));
    if (provider.backgroundTasks) {
      this.backgroundTaskSubscriptions.push(provider.backgroundTasks.subscribe((update) => this.deliverBackgroundTasks(update)));
    }
  }
  adopt(provider: ExecutionProvider): boolean {
    if (this.providers.has(JSON.stringify([provider.kind, provider.instanceId]))) return false;
    this.register(provider);
    return true;
  }
  resolve(kind: ExecutionProvider["kind"], instanceId: string): ExecutionProvider {
    const provider = this.providers.get(JSON.stringify([kind, instanceId]));
    if (!provider) throw new ExecutionCommandError("missing", "Provider instance is not configured on this execution host");
    return provider;
  }
  onFollowUp(listener: FollowUpListener): () => void {
    this.followUpListeners.add(listener);
    return () => { this.followUpListeners.delete(listener); };
  }
  onBackgroundTasks(listener: BackgroundTasksListener): () => void {
    this.backgroundTaskListeners.add(listener);
    return () => { this.backgroundTaskListeners.delete(listener); };
  }
  async close(): Promise<void> {
    for (const unsubscribe of this.followUpSubscriptions.splice(0)) unsubscribe();
    for (const unsubscribe of this.backgroundTaskSubscriptions.splice(0)) unsubscribe();
    const results = await Promise.allSettled([...this.providers.values()].map((provider) => provider.close()));
    if (results.some((result) => result.status === "rejected")) throw new Error("Some provider owners could not be stopped");
  }

  /** Accepted when any listener queued a run; with no host listening yet, the provider discards the turn. */
  private deliverFollowUp(followUp: ProviderFollowUp): boolean {
    let accepted = false;
    for (const listener of this.followUpListeners) accepted = listener(followUp) || accepted;
    return accepted;
  }

  private deliverBackgroundTasks(update: ProviderBackgroundTasks): void {
    for (const listener of this.backgroundTaskListeners) listener(update);
  }
}
