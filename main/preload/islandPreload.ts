import { contextBridge } from "electron";
import { ISLAND_CHANNELS } from "@shared/island/channels";
import type { IslandBridge, IslandView } from "@shared/types/island/island.types";
import { invokeIpc } from "./invokeIpc";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

const send = (channel: string, ...args: readonly unknown[]): void => {
  invokeIpc(channel, ...args).catch((error: unknown) => console.error(`The notch island could not reach Nora on ${channel}`, error));
};

/** The notch island's only bridge: it reads the view and asks main to open things, nothing more. */
const islandBridge: IslandBridge = {
  onView: (listener) => subscribeToIpcEvent<IslandView>(ISLAND_CHANNELS.view, listener),
  setInteractive: (interactive) => send(ISLAND_CHANNELS.interactive, interactive),
  open: (target) => send(ISLAND_CHANNELS.open, target),
  openInbox: () => send(ISLAND_CHANNELS.openInbox),
  openNora: () => send(ISLAND_CHANNELS.openNora)
};

contextBridge.exposeInMainWorld("noraIsland", islandBridge);
