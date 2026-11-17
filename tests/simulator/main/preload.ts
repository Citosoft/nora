import { contextBridge, ipcRenderer } from "electron";
import { createConversationBridge } from "@main/preload/createConversationBridge";
import { nativeBootSchema } from "@shared/personalization/gateway";
import type { ConnectorBridge } from "@shared/ipc/types/connectorGateway.types";
import type { SimulatorBridge } from "../types/bridge.types";

const bridge: SimulatorBridge = {
  async boot() { return nativeBootSchema.parse(await ipcRenderer.invoke("simulator:boot")); },
  conversations: createConversationBridge()
};
contextBridge.exposeInMainWorld("noraChatSimulator", bridge);

/** The composer reads Nora's connectors from `window.nora`; the simulator has none and never stores any. */
const connectors: ConnectorBridge = {
  async request(input) {
    if (input.kind === "list") return [];
    throw new Error("Adding or changing Nora connectors isn't simulated.");
  },
  onChanged() { return () => {}; }
};
contextBridge.exposeInMainWorld("nora", { connectors });
