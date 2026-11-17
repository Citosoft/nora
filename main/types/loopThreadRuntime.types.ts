import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { BotConversationHost } from "./bots/conversations.types";
export interface LoopThreadRuntimeDeps {
  host(): BotConversationHost;
  boot(): NativeBoot;
  registerCheckouts(projectId: string, paths: readonly string[]): Promise<boolean>;
  nextId(): string;
}
