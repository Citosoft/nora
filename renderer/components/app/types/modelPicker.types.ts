import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import type { ProviderBinding, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ProviderCatalog, ProviderCatalogResult, ProviderModel } from "@shared/types/provider/catalog.types";
import type { ConversationClient } from "./conversationClient.types";

export type ModelCatalogState = { status: "idle" } | { status: "loading" } | ProviderCatalogResult;
export interface ModelCatalogStore {
  get(key: string): ModelCatalogState;
  load(provider: NativeProvider, refresh?: boolean): Promise<void>;
  subscribe(listener: () => void): () => void;
}
export interface ModelCatalogDeps {
  client: Pick<ConversationClient, "catalog">;
  workspace: WorkspaceRef;
}
export interface ModelChoice { providerKey: string; modelId: string | null; }
export interface ModelBindingInput {
  provider: NativeProvider | null;
  catalog: ModelCatalogState;
  modelId: string | null;
  policyId: string | null;
  reasoning: string | null;
  locked: ProviderBinding | null;
}
export type ModelBindingResolution = { status: "ready"; binding: ProviderBinding } | { status: "blocked"; message: string | null };
export interface ModelSettingsInput {
  catalog: ProviderCatalog | null;
  policyId: string;
  reasoning: string | null;
  onPolicy(value: string): void;
  onReasoning(value: string | null): void;
}
export interface ModelPopoverProps {
  providers: readonly NativeProvider[];
  store: ModelCatalogStore;
  selectedProvider: NativeProvider | null;
  selectedModel: ProviderModel | null;
  selectedModelId: string | null;
  locked: boolean;
  settings: ModelSettingsInput;
  onSelect(provider: NativeProvider, model: ProviderModel): void;
}
export interface ModelListProps {
  provider: NativeProvider | null;
  state: ModelCatalogState;
  selectedProviderKey: string | null;
  selectedModelId: string | null;
  locked: boolean;
  onSelect(model: ProviderModel): void;
}
export interface ModelOptionsProps extends ModelSettingsInput {
  model: ProviderModel | null;
  locked: boolean;
}
