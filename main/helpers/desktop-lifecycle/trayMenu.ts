import { remoteAccessStatusLabel } from "@shared/remote-access/statusLabel";
import type { RemoteAccessView } from "@shared/types/remote-access/remoteAccess.types";
import type { TrayMenuItem } from "@main/types/desktop-lifecycle/desktopLifecycle.types";

/** The tray/menu bar menu for the current remote access view (null before the remote access service exists). */
export function buildTrayMenu(view: RemoteAccessView | null): TrayMenuItem[] {
  const enabled = view?.enabled === true;
  const status = view && enabled ? remoteAccessStatusLabel(view.status) : "Off";
  return [
    { kind: "action", id: "open", label: "Open Nora" },
    { kind: "status", label: `Remote access: ${status}` },
    ...(enabled ? [{ kind: "action", id: "disable-remote-access", label: "Disable remote access" } as const] : []),
    { kind: "separator" },
    { kind: "action", id: "quit", label: "Quit Nora" }
  ];
}
