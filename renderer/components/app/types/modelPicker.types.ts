import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { ProviderKind } from "@shared/types/provider/providerKind.types";
import type { ProviderConnectionKind } from "@shared/types/provider/account.types";
import type { AiProvider, AiRuntimeTaskProvider, AiSimpleTaskProvider } from "@shared/types/ai.types";
import type { LocalVoiceModelDescriptor } from "@shared/types/voice.types";
import type { MemoryReviewActivity, MemoryReviewRecord } from "@shared/types/bots/memoryReview.types";
import type { ThreadModelDefault } from "@shared/types/personalization/threadModel.types";
import type { NativeBoot, NativeProvider, PersonalizationRequest } from "@shared/ipc/types/personalizationGateway.types";
import type { ProviderBinding, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ProviderCatalog, ProviderCatalogResult, ProviderModel } from "@shared/types/provider/catalog.types";
import type { ConversationClient } from "./conversationClient.types";

export type ModelCatalogState = { status: "idle" } | { status: "loading" } | ProviderCatalogResult;
export interface ModelCatalogStore {
  get(key: string): ModelCatalogState;
  load(provider: Pick<NativeProvider, "kind" | "instanceId">, refresh?: boolean): Promise<void>;
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
  subagentModel: string | null;
  onSubagentModel(value: string | null): void;
}
export interface ModelPopoverProps {
  selectedConnection: ProviderConnectionKind;
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
/** One choice in a composer setting picker such as permissions or reasoning. */
export interface ComposerSettingChoice {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  /** Marks a choice that lets the agent act unchecked, shown as a warning. */
  caution?: boolean;
}
export interface ComposerSettingPopoverProps {
  /** Names the setting for assistive technology, such as "Permissions". */
  name: string;
  choices: readonly ComposerSettingChoice[];
  selectedId: string;
  /** Shown on the trigger when no choice matches `selectedId`. */
  placeholder: string;
  /** True when the choices can't be loaded yet; `locked` still lets the user look without changing anything. */
  disabled: boolean;
  locked: boolean;
  continuation: boolean;
  onSelect(id: string): void;
}
export interface ComposerSettingOptionProps {
  choice: ComposerSettingChoice;
  selected: boolean;
  disabled: boolean;
  onSelect(): void;
}
export interface ModelListProps {
  provider: NativeProvider | null;
  state: ModelCatalogState;
  selectedProviderKey: string | null;
  selectedModelId: string | null;
  locked: boolean;
  favorites: FavoriteModelsState;
  onSelect(model: ProviderModel): void;
  /** Opens Settings → Providers, where the provider can be signed in; absent where the host has no Settings. */
  onOpenProviderSettings?: () => void;
}
/** Where pickers read and save favourite models, kept narrow so hosts without the full native runtime can supply it. */
export interface FavoriteModelsPort {
  models: readonly ThreadModelDefault[];
  /** Rejects with a user-meaningful message when the change could not be saved. */
  setFavorite(model: ThreadModelDefault, favorite: boolean): Promise<void>;
}
/** The saved favourite models and a toggle; toggling is allowed while a chat runs because it doesn't change the thread. */
export interface FavoriteModelsState {
  models: readonly ThreadModelDefault[];
  /** A save in flight, so its star can't be pressed twice. */
  pending: ThreadModelDefault | null;
  error: string | null;
  toggle(model: ThreadModelDefault, favorite: boolean): void;
}
/** One favourite as listed in the picker, resolved against installed providers and their loaded catalogs. */
export type FavoriteModelRow =
  | { status: "ready"; favorite: ThreadModelDefault; provider: NativeProvider; model: ProviderModel; providerLabel: string }
  | { status: "loading"; favorite: ThreadModelDefault; provider: NativeProvider; providerLabel: string }
  | { status: "unavailable"; favorite: ThreadModelDefault; provider: NativeProvider | null; providerLabel: string; reason: string };
export interface FavoriteModelListProps {
  providers: readonly NativeProvider[];
  store: ModelCatalogStore;
  selectedProviderKey: string | null;
  selectedModelId: string | null;
  locked: boolean;
  favorites: FavoriteModelsState;
  onSelect(provider: NativeProvider, model: ProviderModel): void;
}
export interface ModelRowProps {
  label: string;
  description?: string;
  /** Leading provider logo, used where rows from several providers share a list. */
  icon?: ReactNode;
  selected: boolean;
  disabled: boolean;
  favorite: boolean;
  favoriteDisabled: boolean;
  onSelect(): void;
  onFavorite(favorite: boolean): void;
}
export interface SubagentModelOptionProps {
  models: readonly ProviderModel[];
  value: string | null;
  disabled: boolean;
  onChange(value: string | null): void;
}
/** Which saved default a model setting edits: new threads, their subagents, or Nora's chat. */
export type ThreadModelSettingTarget = "thread" | "subagent" | "nora-chat";
export interface ThreadModelDefaultFieldsProps {
  target?: ThreadModelSettingTarget;
  providerKinds?: readonly ProviderKind[];
  /** Catalogs are checkout-scoped; the default is chosen from the focused workspace's catalog. */
  workspace: WorkspaceRef;
}
export interface ThreadModelDefaultSettingProps {
  target?: ThreadModelSettingTarget;
  /** Lists only these providers, for a setting that belongs to one provider. */
  providerKinds?: readonly ProviderKind[];
}
/** `kind` is a provider kind or an agent catalog id; both key the same icon set. */
export interface ProviderOptionLabelProps { kind: string; label: string; connection?: ProviderConnectionKind; }
export interface ProviderModelFieldLabels {
  provider: string;
  model: string;
  /** Option that clears the choice; omit when a provider and model are required. */
  clear?: string;
}
/** Copy, saved value and save request behind one model default setting. */
export interface ThreadModelSettingConfig {
  title: string;
  description: string;
  labels: ProviderModelFieldLabels;
  saved(boot: NativeBoot): ThreadModelDefault | null;
  request(model: ThreadModelDefault | null): PersonalizationRequest;
  unsupportedReason?(catalog: ProviderCatalog): string | null;
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
  /** Lists only these providers; all installed ones when absent. */
  providerKinds?: readonly ProviderKind[];
}
/** The model a signed-in runtime uses for a background task; null keeps the runtime's own default. */
export interface RuntimeTaskModelSelectProps {
  provider: AiRuntimeTaskProvider;
  value: string | null;
  onChange(model: string | null): void;
  models?: readonly ProviderModel[];
}
export interface RuntimeTaskModelSettingProps extends Omit<RuntimeTaskModelSelectProps, "models"> {
  title: string;
  /** What the model is for; the row adds how runtimes authenticate. */
  description: string;
}
export interface RuntimeTaskModelFieldsProps extends Omit<RuntimeTaskModelSelectProps, "models"> {
  /** Catalogs are checkout-scoped; models are listed from the focused workspace's catalog. */
  workspace: WorkspaceRef;
  native: NativeProvider;
}
/** A background-task source as listed in a picker: runtimes show their logo, cloud and local a generic icon. */
export interface TaskSourceOptionLabelProps { source: AiSimpleTaskProvider; label: string; }
/** A cloud API provider (or one of its models) as listed in a picker, with the provider's logo. */
export interface AiProviderOptionLabelProps { provider: AiProvider; label: string; }
export interface LocalVoiceModelOptionLabelProps { model: LocalVoiceModelDescriptor; }
export interface MemoryReviewActivityPanelProps { state: MemoryReviewActivityState; }
export interface MemoryReviewActivityState {
  activity: MemoryReviewActivity | null;
  loading: boolean;
  error: string | null;
  refresh(): void;
}
export interface MemoryReviewSourceLabelProps { record: MemoryReviewRecord; }
