import type { WindowStartupDeps } from "@main/types/windowStartup.types";

/** Activation can arrive while startup is still preparing services and IPC. */
export function createWindowStartup(deps: WindowStartupDeps) {
  let ready = false;

  return {
    start(): void {
      ready = true;
      if (!deps.hasWindow()) deps.createWindow();
    },
    /** Dock click, second launch or tray Open: bring back a hidden or minimised window, or reopen a closed one. */
    activate(): void {
      if (!ready) return;
      if (deps.hasWindow()) deps.showWindow();
      else deps.createWindow();
    }
  };
}
