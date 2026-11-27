import type { JsonFileStore, JsonFileStoreOptions } from "@main/types/jsonFileStore.types";
import type { ConversationInvocation } from "@main/types/execution/gateway.types";
import type { BrowserWindow } from "electron";
import type {
  Accelerator,
  KeybindingCommandId,
  KeybindingOverridesApplyOptions,
  KeybindingOverridesApplyResult,
  KeybindingOverridesInput,
  KeybindingPlatform,
  KeybindingsFile,
  KeybindingUpdateRequest,
  ResolvedKeybinding
} from "@shared/types/keybindings/keybindings.types";

export type KeybindingsFileStore = JsonFileStore<KeybindingsFile>;

export type KeybindingsFileStoreOptions = Omit<JsonFileStoreOptions<KeybindingsFile>, "empty" | "normalize">;

export type KeybindingsListener = (file: KeybindingsFile) => void;

export interface KeybindingsService {
  load(): Promise<void>;
  file(): KeybindingsFile;
  /** Effective bindings on this machine's platform. */
  resolved(): ResolvedKeybinding[];
  update(request: KeybindingUpdateRequest): Promise<KeybindingsFile>;
  /** Importer entry point: applies overrides keyed by Nora command id and reports what happened to each. */
  applyKeybindingOverrides(overrides: KeybindingOverridesInput, options?: KeybindingOverridesApplyOptions): Promise<KeybindingOverridesApplyResult>;
  subscribe(listener: KeybindingsListener): () => void;
}

export type KeybindingsServiceOptions = {
  store: KeybindingsFileStore;
  platform: KeybindingPlatform;
};

export interface KeybindingsIpcDeps {
  ipc: {
    handle(channel: string, handler: (event: ConversationInvocation, input?: unknown) => Promise<KeybindingsFile> | KeybindingsFile): void;
    removeHandler(channel: string): void;
  };
  service: KeybindingsService;
  isAllowedSender(event: ConversationInvocation): boolean;
  notify(file: KeybindingsFile): void;
}

export type KeybindingAcceleratorLookup = (commandId: KeybindingCommandId) => Accelerator | null;

export type MacApplicationMenuIpcDeps = {
  getMainWindow: () => BrowserWindow | null;
  keybindings: Pick<KeybindingsService, "resolved" | "subscribe">;
};
