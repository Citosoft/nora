import type { ConversationCommand } from "@shared/types/conversation/contracts.types";
import type { IdleCompactionMode } from "@shared/types/personalization/compaction.types";
import type { StoreReader } from "./store.types";
import type { ProviderResolver } from "./provider.types";

export interface IdleCompactionDependencies {
  store: Pick<StoreReader, "summaries" | "header" | "history" | "hasBackgroundActivity" | "writers" | "checkpointReservations">;
  providers: ProviderResolver;
  mode(): IdleCompactionMode;
  now(): string;
  dispatch(command: ConversationCommand): void;
  onError(): void;
}
