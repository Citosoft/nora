import type { AppActionOutcome, AppRuntime } from "./apps.types";
import type { AppActivityEntry, AppIcon, AppSpec, AppSummary, AppVersion } from "@shared/types/apps/apps.types";
import type { JsonValue } from "@main/jsonValue";
import type { AppFile, PickedAppFile } from "@shared/types/apps/portable.types";
import type { Connector } from "@shared/types/connectors/connectors.types";
import type { McpServerLogo } from "@shared/types/provider/mcp.types";
import type { ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { ConversationClient } from "./conversationClient.types";
import type { BindingOrigin } from "./modelPicker.types";
import type { ConnectorAccessChoices, NoraConnectors } from "./noraConnectors.types";

export interface ActionOutcomeToastProps { outcome: AppActionOutcome; onDismiss(): void; }
export interface AppHeaderProps {
  runtime: AppRuntime;
  connectors: readonly Connector[] | null;
  /** Opens the app's builder thread beside it; absent when the thread cannot be opened here. */
  onEdit: (() => void) | null;
  onRename(name: string): void;
  onTrust(trusted: boolean): void;
  onExport(): void;
  onDelete(): void;
}
export interface AppConnectorBadgesProps {
  spec: Pick<AppSpec, "sources" | "actions">;
  connectors: readonly Connector[] | null;
}
export interface AppConnectorLogosProps {
  connectorIds: readonly string[];
  connectors: readonly Connector[];
  /** Logos shown before the rest collapse into a "+N" count. */
  max?: number;
}
export interface AppIconProps { icon: AppIcon; className?: string; }
export interface AppActionArgsProps { args: Readonly<Record<string, JsonValue>>; className?: string; }
export interface AppActivityDialogProps { open: boolean; onOpenChange(open: boolean): void; load(): Promise<AppActivityEntry[]>; }
export interface AppVersionsMenuProps { load(): Promise<AppVersion[]>; restore(version: number): Promise<void>; currentVersion: number; }
export interface AppsHomeProps { apps: readonly AppSummary[]; error: string | null; onOpen(appId: string): void; draft: NewAppDraft; }
export interface AppsHomeGridProps { apps: readonly AppSummary[]; onOpen(appId: string): void; }

/** Importing an app file: the picked file, the connector chosen for each one it names, and whether it can be saved yet. */
export interface AppImport {
  picked: PickedAppFile | null;
  /** File connector id → local connector id, or null while unchosen. */
  choices: Readonly<Record<string, string | null>>;
  choose(fileConnectorId: string, localConnectorId: string | null): void;
  busy: boolean;
  error: string | null;
  start(): void;
  confirm(): void;
  cancel(): void;
}
export interface ImportAppDialogProps { draft: NewAppDraft; importer: AppImport; }

/** What a new app starts from: the description, where it runs, which model builds it and which connectors it may use. */
export interface NewAppDraft {
  boot: NativeBoot;
  client: ConversationClient;
  text: string;
  setText(text: string): void;
  workspace: NativeWorkspace | null;
  selectWorkspace(workspaceId: string): void;
  provider: ProviderBinding | null;
  setProvider(binding: ProviderBinding | null, origin: BindingOrigin): void;
  connectors: NoraConnectors;
  accessChoices: ConnectorAccessChoices;
  /** Connectors available in the chosen workspace, in the order shown. */
  available: readonly Connector[];
  selectedConnectorIds: ReadonlySet<string>;
  toggleConnector(id: string): void;
  busy: boolean;
  error: string | null;
  /** Starts the builder thread; rejects with a user-meaningful message. */
  launch(): Promise<void>;
}
export interface NewAppComposerProps { draft: NewAppDraft; autoFocus?: boolean; }
export interface AppConnectorPickerProps { draft: NewAppDraft; }
export interface AppStarterGridProps { onPick(text: string): void; }

export interface AppInstallFrameProps {
  title: string;
  /** Where the app comes from, shown under the title. */
  source?: string;
  open: boolean;
  busy?: boolean;
  onClose(): void;
  children: import("react").ReactNode;
}
/** reused: a local connector stands in · added: Nora creates it on install · setup: the user must add or choose one first. */
export type AppImportConnectorState = "reused" | "added" | "setup";
export interface AppImportConnectorReview {
  fileId: string;
  described: AppFile["connectors"][string];
  /** Known from the server URL, so a connector shows its logo before any local one stands in for it. */
  logo: McpServerLogo | undefined;
  /** Local connectors on the same server, the only ones offered in its place. */
  candidates: readonly Connector[];
  chosen: Connector | null;
  state: AppImportConnectorState;
}
export interface AppImportReview {
  connectors: AppImportConnectorReview[];
  actionCount: number;
  localFiles: string[];
  needsSetup: number;
}
export interface ImportConnectorRowProps {
  entry: AppImportConnectorReview;
  disabled: boolean;
  onChoose(localConnectorId: string | null): void;
}
export interface ImportAppAccessProps { review: AppImportReview; }
export interface ImportReviewRowProps {
  leading: import("react").ReactNode;
  label: import("react").ReactNode;
  /** Shown on hover, such as a connector's server URL. */
  title?: string;
  children: import("react").ReactNode;
}
export interface ImportAppAccessLineProps { icon: import("react").ReactNode; title?: string; children: import("react").ReactNode; }
export interface AppConnectorSetupProps { spec: AppSpec; connections: NoraConnectors; }
