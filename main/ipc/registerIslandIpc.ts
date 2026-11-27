import { ISLAND_CHANNELS } from "@shared/island/channels";
import { islandDemoScenarioSchema, islandInteractiveSchema, islandTargetSchema } from "@shared/island/contracts";
import type { IslandIpcDeps, IslandIpcEvent } from "@main/types/island/island.types";

/** Island windows are the only senders of their own channels; only the app window may start a demo. */
export function registerIslandIpc({ ipc, runtime, isAllowedSender }: IslandIpcDeps): void {
  const assertIsland = (event: IslandIpcEvent): number => {
    if (!runtime.ownsSender(event.sender.id)) throw new Error("Only the notch island can use this channel.");
    return event.sender.id;
  };
  ipc.handle(ISLAND_CHANNELS.interactive, (event, input: unknown) => {
    runtime.setInteractive(assertIsland(event), islandInteractiveSchema.parse(input));
  });
  ipc.handle(ISLAND_CHANNELS.open, (event, input: unknown) => {
    assertIsland(event);
    runtime.open(islandTargetSchema.parse(input));
  });
  ipc.handle(ISLAND_CHANNELS.openInbox, (event) => {
    assertIsland(event);
    runtime.openInbox();
  });
  ipc.handle(ISLAND_CHANNELS.openNora, (event) => {
    assertIsland(event);
    runtime.openNora();
  });
  ipc.handle(ISLAND_CHANNELS.demo, (event, input: unknown) => {
    if (!isAllowedSender(event)) throw new Error("This window cannot start the notch island demo.");
    return runtime.startDemo(islandDemoScenarioSchema.parse(input));
  });
  ipc.handle(ISLAND_CHANNELS.stopDemo, (event) => {
    if (!isAllowedSender(event)) throw new Error("This window cannot stop the notch island demo.");
    runtime.stopDemo();
  });
}
