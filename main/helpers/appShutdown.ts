import type { AppQuitEvent, AppShutdownDeps } from "@main/types/appShutdown.types";

/** Execution belongs to the app process and survives closing a macOS window. */
export function createAppShutdown(deps: AppShutdownDeps) {
  let status: "running" | "stopping" | "stopped" = "running";

  return {
    isQuitting: () => status !== "running",
    beforeQuit(event: AppQuitEvent): void {
      if (status === "stopped") return;
      event.preventDefault();
      if (status === "stopping") return;
      status = "stopping";
      void deps.shutdown().catch((error: unknown) => {
        deps.onFailure(error instanceof Error ? error.message : "Nora could not finish shutting down its execution host");
      }).finally(() => {
        status = "stopped";
        deps.quit();
      });
    }
  };
}
