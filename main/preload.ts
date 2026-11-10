import type { NoraBridge } from "@shared/ipc/types/noraBridge.types";
import { contextBridge } from "electron";
import { createConversationBridge } from "./preload/createConversationBridge";
import { createPersonalizationBridge } from "./preload/createPersonalizationBridge";

import { createAppBridge } from "./preload/createAppBridge";
import { createIntegrationBridge } from "./preload/createIntegrationBridge";
import { createLoopBridge } from "./preload/createLoopBridge";
import { createSessionBridge } from "./preload/createSessionBridge";
import { createSystemBridge } from "./preload/createSystemBridge";
import { createToolingBridge } from "./preload/createToolingBridge";
import { createWorkspaceBridge } from "./preload/createWorkspaceBridge";

const noraApi: NoraBridge = {
  conversations: createConversationBridge(),
  personalization: createPersonalizationBridge(),
  ...createAppBridge(),
  ...createWorkspaceBridge(),
  ...createSessionBridge(),
  ...createToolingBridge(),
  ...createSystemBridge(),
  ...createIntegrationBridge(),
  ...createLoopBridge()
};

contextBridge.exposeInMainWorld("nora", noraApi);
