import { app, Notification } from "electron";
import { openThreadChannel } from "@shared/conversations/attention";
import { startAttentionNotifier } from "./notifier";
import type { DesktopAttentionDeps } from "@main/types/attention.types";

/** Desktop notifications and the Dock or taskbar badge for threads and bots waiting on the user. */
export function startDesktopAttention(deps: DesktopAttentionDeps): () => void {
  const badgeSupported = process.platform === "darwin" || process.platform === "linux";
  return startAttentionNotifier({
    host: deps.host,
    shouldNotify: () => {
      const window = deps.getMainWindow();
      return deps.notificationsEnabled() && Notification.isSupported() && !!window && !window.isDestroyed() && !window.isFocused();
    },
    notify(notice) {
      const notification = new Notification({ title: notice.title, body: notice.body, icon: deps.getAppIcon(), urgency: "critical" });
      notification.on("click", () => {
        deps.focusMainWindow();
        const window = deps.getMainWindow();
        if (window && !window.isDestroyed()) window.webContents.send(openThreadChannel, { conversationId: notice.conversationId });
      });
      notification.show();
    },
    setBadge(count) { if (badgeSupported) app.setBadgeCount(count); }
  });
}
