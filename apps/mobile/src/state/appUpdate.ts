import type { AppUpdatePort, AppUpdateSnapshot, UpdateAction, UpdateScreenState } from "@/types/appUpdate.types";

/** The native updater owns availability and downloaded state; local state tracks only the user's install attempt. */
export function updateScreen(snapshot: AppUpdateSnapshot, action: UpdateAction, dismissedKey: string | null): UpdateScreenState | null {
  if (!snapshot.enabled || !snapshot.key || snapshot.key === dismissedKey) return null;
  if (action.kind === "restarting" || action.kind === "error") return action;
  if (!snapshot.available && !snapshot.pending && action.kind !== "downloading") return null;
  if (action.kind === "downloading" || snapshot.downloading) {
    const progress = snapshot.progress;
    return { kind: "downloading", installing: action.kind === "downloading", progress: progress !== undefined && Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : null };
  }
  return { kind: "available", downloaded: snapshot.pending };
}

/** Never restart after a failed or empty download. Retry can reuse an update already cached by Expo. */
export async function installAppUpdate(port: AppUpdatePort, downloaded: boolean, onState: (state: UpdateAction) => void): Promise<void> {
  let phase: "downloading" | "restarting" = downloaded ? "restarting" : "downloading";
  try {
    if (!downloaded) {
      onState({ kind: "downloading" });
      if (!await port.download()) { onState({ kind: "idle" }); return; }
    }
    phase = "restarting";
    onState({ kind: "restarting" });
    await port.reload();
  } catch {
    onState({ kind: "error", phase });
  }
}
