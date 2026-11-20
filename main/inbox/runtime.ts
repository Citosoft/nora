import { inboxChangedChannel } from "@shared/inbox/gateway";
import { createInboxLedgerStore } from "./ledgerStore";
import { createInboxService } from "./service";
import { startDesktopInbox } from "./desktop";
import type { InboxRuntime, InboxRuntimeDeps } from "@main/types/inbox/inboxRuntime.types";

/** Builds the inbox service and connects it to the desktop: window updates, notifications and the badge. */
export function startInboxRuntime(deps: InboxRuntimeDeps): InboxRuntime {
  const service = createInboxService({
    host: deps.host,
    ledger: createInboxLedgerStore(deps.stateDirectory),
    listWorkflowRuns: async () => (await Promise.all(deps.projectIds().map((projectId) => deps.listWorkflowRuns(projectId)
      // A project whose workflow state cannot be read (for example over SSH) simply has no workflow items.
      .catch(() => [])))).flat(),
    workspaceForProject: deps.workspaceForProject,
    connectors: deps.connectors,
    alerts: deps.alerts,
    now: () => new Date().toISOString(),
    setTimeout(callback, delayMs) { const timer = setTimeout(callback, delayMs); return { cancel: () => clearTimeout(timer) }; }
  });
  const stopService = service.start();
  const stopBroadcast = service.subscribe((snapshot) => {
    const window = deps.getMainWindow();
    if (window && !window.isDestroyed()) window.webContents.send(inboxChangedChannel, snapshot);
  });
  const stopDesktop = startDesktopInbox({ inbox: service, getMainWindow: deps.getMainWindow, getAppIcon: deps.getAppIcon,
    notificationsEnabled: deps.notificationsEnabled, focusMainWindow: deps.focusMainWindow });
  return { service, stop() { stopDesktop(); stopBroadcast(); stopService(); } };
}
