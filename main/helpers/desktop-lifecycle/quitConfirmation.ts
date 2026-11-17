import type { ActiveWorkCount, QuitConfirmationDeps, QuitPrompt, QuitReason } from "@main/types/desktop-lifecycle/desktopLifecycle.types";

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? "" : "s"}`;

const CONFIRM_LABELS: Record<QuitReason, string> = { quit: "Quit Nora", update: "Restart to Update", relaunch: "Restart Nora" };
const MESSAGES: Record<QuitReason, string> = {
  quit: "Quit Nora?",
  update: "Restart Nora to install the update?",
  relaunch: "Restart Nora?"
};

/** The warning shown before stopping Nora, or null when nothing would be interrupted and no prompt is needed. */
export function describeQuitPrompt(reason: QuitReason, work: ActiveWorkCount): QuitPrompt | null {
  if (work.total === 0) return null;
  const interrupted = plural(work.total, "task");
  return {
    message: MESSAGES[reason],
    detail: `${interrupted} ${work.total === 1 ? "is" : "are"} still running and will be interrupted.`,
    confirmLabel: CONFIRM_LABELS[reason],
    cancelLabel: "Cancel"
  };
}

/** Asks only when quitting would interrupt work; resolves true to continue. */
export function createQuitConfirmation(deps: QuitConfirmationDeps): (reason: QuitReason) => Promise<boolean> {
  return async (reason) => {
    let prompt: QuitPrompt | null;
    try {
      prompt = describeQuitPrompt(reason, deps.countActiveWork());
    } catch (error) {
      // Counting must never trap the user in an app they cannot quit.
      deps.log("Could not count running tasks before quitting.", error);
      return true;
    }
    return prompt ? deps.showPrompt(prompt) : true;
  };
}
