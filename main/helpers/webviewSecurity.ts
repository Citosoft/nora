import { app, shell } from "electron";

export function isAllowedBrowserGuestUrl(value: string): boolean {
  if (value === "about:blank") {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function configureWebviewGuests(): void {
  app.on("web-contents-created", (_event, contents) => {
    if (contents.getType() !== "webview") {
      return;
    }

    contents.setWindowOpenHandler(({ url }) => {
      if (isAllowedBrowserGuestUrl(url)) {
        void shell.openExternal(url);
      }

      return { action: "deny" };
    });
  });
}
