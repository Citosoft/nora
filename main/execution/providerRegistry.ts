import type { ExecutionProvider, ProviderResolver } from "@main/types/execution/provider.types";
import { ExecutionCommandError } from "./errors";

export class ProviderRegistry implements ProviderResolver {
  private readonly providers = new Map<string, ExecutionProvider>();
  register(provider: ExecutionProvider): void {
    const key = JSON.stringify([provider.kind, provider.instanceId]);
    if (this.providers.has(key)) throw new ExecutionCommandError("conflict", "Provider instance is already registered");
    this.providers.set(key, provider);
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
  async close(): Promise<void> {
    const results = await Promise.allSettled([...this.providers.values()].map((provider) => provider.close()));
    if (results.some((result) => result.status === "rejected")) throw new Error("Some provider owners could not be stopped");
  }
}
