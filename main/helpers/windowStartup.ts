import type { WindowStartupDeps } from "@main/types/windowStartup.types";

/** Activation can arrive while startup is still preparing services and IPC. */
export function createWindowStartup(deps: WindowStartupDeps) {
  let ready = false;

  function activate(): void {
    if (ready && !deps.hasWindow()) {
      deps.createWindow();
    }
  }

  return {
    start(): void {
      ready = true;
      activate();
    },
    activate
  };
}
