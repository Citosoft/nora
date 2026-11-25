import type { ConversationCommand } from "@shared/types/conversation/contracts.types";
import type { IdleThreadStore } from "./idleThread.types";
import type { StoreReader } from "./store.types";

export interface IdleSettlementDependencies {
  store: IdleThreadStore & Pick<StoreReader, "maintenanceConversations">;
  days(): number | null;
  now(): string;
  dispatch(command: ConversationCommand): void;
  onError(): void;
}
