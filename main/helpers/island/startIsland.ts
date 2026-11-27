import { countActiveWork } from "@main/helpers/desktop-lifecycle/activeWork";
import type { IslandRuntime, StartIslandDeps } from "@main/types/island/island.types";
import { createElectronIslandScreen, createElectronIslandWindowFactory } from "./electronIslandWindow";
import { createIslandRuntime } from "./islandRuntime";

/** Coalesces a turn's burst of run events into one redraw without the island feeling late. */
const REFRESH_DELAY_MS = 150;
/** Long enough to hover the demo and look through its rows. */
const DEMO_DURATION_MS = 20_000;

/** Starts the macOS notch island over the app's threads and terminal agents; on other platforms it does nothing. */
export function startIsland(deps: StartIslandDeps): IslandRuntime {
  return createIslandRuntime({
    supported: process.platform === "darwin",
    settings: deps.settings,
    countActiveWork: () => countActiveWork(deps.readWork()),
    screen: createElectronIslandScreen(),
    createWindow: createElectronIslandWindowFactory(deps.paths),
    open: (target) => {
      switch (target.kind) {
        case "thread": deps.openThread(target.conversationId); return;
        case "terminal-agent": deps.openTerminalAgent(target.agentId); return;
      }
    },
    openInbox: deps.openInbox,
    openNora: deps.openNora,
    watchWork(onChange) {
      const stopThreads = deps.host.subscribe({ after: deps.host.eventCursor(),
        onError: (error) => console.error("The notch island stopped following threads", error),
        // Streamed timeline items never change whether a thread is active; runs, requests and queues do.
        onEvent: (event) => { if (event.payload.kind !== "item") onChange(); } });
      const stopAgents = deps.onAgentsChanged(onChange);
      return () => { stopThreads(); stopAgents(); };
    },
    log: console.error,
    refreshDelayMs: REFRESH_DELAY_MS,
    demoDurationMs: DEMO_DURATION_MS
  });
}
