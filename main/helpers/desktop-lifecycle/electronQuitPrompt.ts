import { app, dialog, type BrowserWindow } from "electron";
import type { QuitPrompt } from "@main/types/desktop-lifecycle/desktopLifecycle.types";

/**
 * Shows the quit warning as a native message box. It is attached to the window only while that window is visible;
 * a sheet on a hidden window would never appear, so from the tray the box is shown on its own in front.
 */
export async function showElectronQuitPrompt(prompt: QuitPrompt, window: BrowserWindow | null): Promise<boolean> {
  const options = {
    type: "warning" as const,
    message: prompt.message,
    detail: prompt.detail,
    buttons: [prompt.confirmLabel, prompt.cancelLabel],
    defaultId: 1,
    cancelId: 1,
    noLink: true
  };
  const parent = window && !window.isDestroyed() && window.isVisible() && !window.isMinimized() ? window : null;
  if (!parent && process.platform === "darwin") app.focus({ steal: true });
  const { response } = parent ? await dialog.showMessageBox(parent, options) : await dialog.showMessageBox(options);
  return response === 0;
}
