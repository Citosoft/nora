import { contextBridge, ipcRenderer } from "electron";
import { createConversationBridge } from "@main/preload/createConversationBridge";
import { nativeBootSchema } from "@shared/personalization/gateway";
import type { SimulatorBridge } from "../types/bridge.types";

const bridge: SimulatorBridge = {
  async boot() { return nativeBootSchema.parse(await ipcRenderer.invoke("simulator:boot")); },
  conversations: createConversationBridge()
};
contextBridge.exposeInMainWorld("noraChatSimulator", bridge);
