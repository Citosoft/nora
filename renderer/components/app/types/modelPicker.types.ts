import type { ThreadModelDefault } from "@shared/types/personalization/threadModel.types";
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
/** Inherited choices follow the configured thread default and are not saved with the draft. */
export interface ModelChoice { providerKey: string; modelId: string | null; inherited: boolean; }
/** Whether a draft's binding was picked by the user (saved with the draft) or inherited from the default (not saved). */
export type BindingOrigin = "chosen" | "inherited";
export interface ModelBindingInput {
  /** Only the provider's identity matters for binding; MCP reporting and labels do not. */
  provider: Pick<NativeProvider, "kind" | "instanceId"> | null;
  catalog: ModelCatalogState;
  modelId: string | null;
  policyId: string | null;
  reasoning: string | null;
  /** Default subagent model, or null for the runtime's own default. */
  subagentModel: string | null;
  locked: ProviderBinding | null;
}
export type ModelBindingResolution = { status: "ready"; binding: ProviderBinding } | { status: "blocked"; message: string | null };
export interface ModelSettingsInput {
  catalog: ProviderCatalog | null;
  policyId: string;
  reasoning: string | null;
  subagentModel: string | null;
  onPolicy(value: string): void;
  onReasoning(value: string | null): void;
  onSubagentModel(value: string | null): void;
}
export interface ModelPopoverProps {
  continuation?: boolean;
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
export interface SubagentModelOptionProps {
  models: readonly ProviderModel[];
  value: string | null;
  disabled: boolean;
  onChange(value: string | null): void;
}
export interface ThreadModelDefaultFieldsProps {
  target?: "thread" | "subagent";
  /** Catalogs are checkout-scoped; the default is chosen from the focused workspace's catalog. */
  workspace: WorkspaceRef;
}
export interface ThreadModelDefaultSettingProps { target?: "thread" | "subagent"; }
export interface ProviderOptionLabelProps { kind: NativeProvider["kind"]; label: string; }
export interface ProviderModelFieldLabels {
  provider: string;
  model: string;
  /** Option that clears the choice; omit when a provider and model are required. */
  clear?: string;
}
/** Controlled provider and model selects backed by the workspace's model catalogs. */
export interface ProviderModelFieldsProps {
  workspace: WorkspaceRef;
  value: ThreadModelDefault | null;
  onChange(value: ThreadModelDefault | null): void;
  labels: ProviderModelFieldLabels;
  disabled?: boolean;
  error?: string | null;
  /** Explains why the chosen provider cannot be used here, or null when it can. */
  unsupportedReason?(catalog: ProviderCatalog): string | null;
}
