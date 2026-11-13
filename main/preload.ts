import type { NoraBridge } from "@shared/ipc/types/noraBridge.types";
import { contextBridge } from "electron";
import { createConversationBridge } from "./preload/createConversationBridge";
import { createPersonalizationBridge } from "./preload/createPersonalizationBridge";
import { createBotMemoryBridge } from "./preload/createBotMemoryBridge";
import { createAttentionBridge } from "./preload/createAttentionBridge";
import { createAccountBridge } from "./preload/createAccountBridge";
import { exposeAccountSession } from "./preload/exposeAccountSession";
import { createSettingsSyncBridge } from "./preload/createSettingsSyncBridge";

import { createAppBridge } from "./preload/createAppBridge";
import { createIntegrationBridge } from "./preload/createIntegrationBridge";
import { createLoopBridge } from "./preload/createLoopBridge";
import { createSessionBridge } from "./preload/createSessionBridge";
import { createSystemBridge } from "./preload/createSystemBridge";
import { createToolingBridge } from "./preload/createToolingBridge";
import { createWorkspaceBridge } from "./preload/createWorkspaceBridge";

const noraApi: NoraBridge = {
  settingsSync: createSettingsSyncBridge(),
  account: createAccountBridge(),
  conversations: createConversationBridge(),
  personalization: createPersonalizationBridge(),
  botMemory: createBotMemoryBridge(),
  attention: createAttentionBridge(),
  ...createAppBridge(),
  ...createWorkspaceBridge(),
  ...createSessionBridge(),
  ...createToolingBridge(),
  ...createSystemBridge(),
  ...createIntegrationBridge(),
  ...createLoopBridge()
};

contextBridge.exposeInMainWorld("nora", noraApi);
exposeAccountSession();
