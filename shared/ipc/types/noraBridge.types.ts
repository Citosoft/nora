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
import type { AttentionBridge } from "./attentionGateway.types";
import type { AccountBridge } from "@shared/types/account/account.types";
import type { SettingsSyncBridge } from "@shared/types/settings-sync/sync.types";

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
  attention: AttentionBridge;
}
