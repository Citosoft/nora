import type { RemoteAccessStatus } from "@shared/types/remote-access/remoteAccess.types";

/** The short status label shown in the tray/menu bar and as the settings headline. */
export function remoteAccessStatusLabel(status: RemoteAccessStatus): string {
  switch (status.status) {
    case "disabled": return "Off";
    case "downloading": return "Downloading connector…";
    case "starting": return "Connecting…";
    case "connected": return "Connected";
    case "reconnecting": return "Reconnecting";
    case "paused": return "Paused – sign in";
    case "error": return "Needs attention";
  }
}
