import { remoteAccessStatusLabel } from "@shared/remote-access/statusLabel";
import { NORA_RELAY_NAME } from "@shared/remote-access/constants";
import type { RemoteAccessView } from "@shared/types/remote-access/remoteAccess.types";
import type { TrayMenuItem } from "@main/types/desktop-lifecycle/desktopLifecycle.types";

/** The tray/menu bar menu for the current remote access view (null before the remote access service exists). */
export function buildTrayMenu(view: RemoteAccessView | null): TrayMenuItem[] {
  const enabled = view?.enabled === true;
  const status = view && enabled ? remoteAccessStatusLabel(view.status) : "Off";
  return [
    { kind: "action", id: "open", label: "Open Nora" },
    { kind: "status", label: `${NORA_RELAY_NAME}: ${status}` },
    ...(enabled ? [{ kind: "action", id: "disable-remote-access", label: `Turn off ${NORA_RELAY_NAME}` } as const] : []),
    { kind: "separator" },
    { kind: "action", id: "quit", label: "Quit Nora" }
  ];
}
