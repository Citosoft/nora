import { app, Notification } from "electron";
import { inboxOpenChannel } from "@shared/inbox/gateway";
import { startInboxNotifier } from "./notifier";
import type { DesktopInboxDeps } from "@main/types/inbox/inbox.types";

/** Desktop notifications and the Dock or taskbar badge for whatever in the inbox needs the user. */
export function startDesktopInbox(deps: DesktopInboxDeps): () => void {
  const badgeSupported = process.platform === "darwin" || process.platform === "linux";
  return startInboxNotifier({
    inbox: deps.inbox,
    now: () => new Date().toISOString(),
    shouldNotify: () => {
      const window = deps.getMainWindow();
      return deps.notificationsEnabled() && Notification.isSupported() && !!window && !window.isDestroyed() && !window.isFocused();
    },
    notify(notice) {
      const notification = new Notification({ title: notice.title, body: notice.body, icon: deps.getAppIcon(), urgency: "critical" });
      notification.on("click", () => {
        deps.focusMainWindow();
        const window = deps.getMainWindow();
        if (window && !window.isDestroyed()) window.webContents.send(inboxOpenChannel, notice.target);
      });
      notification.show();
    },
    setBadge(count) { if (badgeSupported) app.setBadgeCount(count); }
  });
}
