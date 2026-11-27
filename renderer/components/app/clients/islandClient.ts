import type { IslandAppBridge } from "@shared/types/island/island.types";

export const islandClient: IslandAppBridge = {
  demo: (scenario) => window.nora.island.demo(scenario),
  stopDemo: () => window.nora.island.stopDemo()
};
