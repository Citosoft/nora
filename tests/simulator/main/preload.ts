import { contextBridge, ipcRenderer } from "electron";
import { createConversationBridge } from "@main/preload/createConversationBridge";
import { nativeBootSchema } from "@shared/personalization/gateway";
import { createSecretBridge } from "@main/preload/createSecretBridge";
import type { SimulatorBridge } from "../types/bridge.types";

const bridge: SimulatorBridge = {
  async boot() { return nativeBootSchema.parse(await ipcRenderer.invoke("simulator:boot")); },
  conversations: createConversationBridge()
};
contextBridge.exposeInMainWorld("noraChatSimulator", bridge);

/** Secrets use the production bridge: the simulator runs the real secret service behind it. Connectors are faked in the renderer. */
contextBridge.exposeInMainWorld("nora", { secrets: createSecretBridge() });
