import type { AppBridge } from "./appGateway.types";
import type { IntegrationBridge } from "./integrationGateway.types";
import type { LoopBridge } from "./loopGateway.types";
import type { SessionBridge } from "./sessionGateway.types";
import type { SystemBridge } from "./systemGateway.types";
import type { ToolingBridge } from "./toolingGateway.types";
import type { WorkspaceBridge } from "./workspaceGateway.types";
import type { ConversationBridge } from "./conversationGateway.types";
import type { PersonalizationBridge } from "./personalizationGateway.types";
import type { BotMemoryBridge } from "./botMemoryGateway.types";
import type { BotRoutineBridge } from "./botRoutineGateway.types";
import type { ConnectorBridge } from "./connectorGateway.types";
import type { SecretBridge } from "./secretGateway.types";
import type { ChatBranchBridge } from "./chatBranchGateway.types";
import type { DirectContextBridge } from "./directContextGateway.types";
import type { InboxBridge } from "./inboxGateway.types";
import type { AppsBridge } from "./appsGateway.types";
import type { AccountBridge } from "@shared/types/account/account.types";
import type { SettingsSyncBridge } from "@shared/types/settings-sync/sync.types";
import type { RemoteAccessBridge } from "./remoteAccessGateway.types";
import type { KeybindingsBridge } from "./keybindingsGateway.types";
import type { IslandAppBridge } from "@shared/types/island/island.types";
import type { AppImportBridge } from "./appImportGateway.types";

export interface NoraBridge
  extends AppBridge,
    IntegrationBridge,
    LoopBridge,
    SessionBridge,
    SystemBridge,
    ToolingBridge,
    WorkspaceBridge {
  settingsSync: SettingsSyncBridge;
  account: AccountBridge;
  conversations: ConversationBridge;
  personalization: PersonalizationBridge;
  botMemory: BotMemoryBridge;
  botRoutines: BotRoutineBridge;
  connectors: ConnectorBridge;
  secrets: SecretBridge;
  chatBranches: ChatBranchBridge;
  directContext: DirectContextBridge;
  inbox: InboxBridge;
  apps: AppsBridge;
  remoteAccess: RemoteAccessBridge;
  keybindings: KeybindingsBridge;
  island: IslandAppBridge;
  appImport: AppImportBridge;
}
