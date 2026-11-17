import type { AppShutdown, AppShutdownDeps } from "@main/types/appShutdown.types";
import type { QuitReason } from "@main/types/desktop-lifecycle/desktopLifecycle.types";

/** Execution belongs to the app process and survives closing a macOS window. */
export function createAppShutdown(deps: AppShutdownDeps): AppShutdown {
  let status: "running" | "confirming" | "stopping" | "stopped" = "running";
  let pendingDecision: Promise<boolean> | null = null;
  let finalQuit: () => void = deps.quit;

  const stop = (): void => {
    status = "stopping";
    void deps.shutdown().catch((error: unknown) => {
      deps.onFailure(error instanceof Error ? error.message : "Nora could not finish shutting down its execution host");
    }).finally(() => {
      status = "stopped";
      finalQuit();
    });
  };

  /** Repeated requests while the prompt is open share its answer instead of opening another. */
  const confirmThenStop = (reason: QuitReason, proceed: () => void): Promise<boolean> => {
    if (status === "confirming" && pendingDecision) return pendingDecision;
    if (status !== "running") return Promise.resolve(false);
    status = "confirming";
    pendingDecision = deps.confirmQuit(reason).catch((error: unknown) => {
      // A broken prompt must not make Nora impossible to quit.
      deps.onFailure(error instanceof Error ? error.message : "Nora could not confirm quitting");
      return true;
    }).then((confirmed) => {
      pendingDecision = null;
      if (!confirmed) {
        status = "running";
        return false;
      }
      finalQuit = proceed;
      stop();
      return true;
    });
    return pendingDecision;
  };

  return {
    isQuitting: () => status === "stopping" || status === "stopped",
    beforeQuit(event): void {
      if (status === "stopped") return;
      event.preventDefault();
      void confirmThenStop("quit", deps.quit);
    },
    request: confirmThenStop
  };
}
