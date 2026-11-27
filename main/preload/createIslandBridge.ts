import { ISLAND_CHANNELS } from "@shared/island/channels";
import { islandDemoResultSchema } from "@shared/island/contracts";
import type { IslandAppBridge } from "@shared/types/island/island.types";
import { invokeIpc } from "./invokeIpc";

/** The app window's controls for the notch island; the island window has its own, narrower bridge. */
export function createIslandBridge(): IslandAppBridge {
  return {
    demo: async (scenario) => islandDemoResultSchema.parse(await invokeIpc(ISLAND_CHANNELS.demo, scenario)),
    stopDemo: async () => { await invokeIpc(ISLAND_CHANNELS.stopDemo); }
  };
}
