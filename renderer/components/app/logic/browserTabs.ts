import type { BrowserTabState } from "@/components/app/types";

export function getCurrentBrowserUrl(tab: BrowserTabState): string {
  return tab.history[tab.historyIndex] ?? "about:blank";
}

export function getBrowserTabTitle(url: string): string {
  if (url === "about:blank") {
    return "New browser tab";
  }

  try {
    const parsed = new URL(url);
    return parsed.hostname || url;
  } catch {
    return url;
  }
}

export function normalizeBrowserUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "about:blank";
  }

  if (trimmed === "about:blank") {
    return trimmed;
  }

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) {
    try {
      return new URL(trimmed).toString();
    } catch {
      return null;
    }
  }

  const isLocalHost =
    /^localhost(?::\d+)?(?:\/|$)/i.test(trimmed) ||
    /^127(?:\.\d{1,3}){3}(?::\d+)?(?:\/|$)/.test(trimmed) ||
    /^0\.0\.0\.0(?::\d+)?(?:\/|$)/.test(trimmed);
  const protocol = isLocalHost ? "http://" : "https://";

  try {
    return new URL(`${protocol}${trimmed}`).toString();
  } catch {
    return null;
  }
}

export function createBrowserTab(projectId: string, url = "about:blank"): BrowserTabState {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `browser-tab-${Date.now()}`,
    projectId,
    title: getBrowserTabTitle(url),
    faviconUrl: null,
    history: [url],
    historyIndex: 0,
    status: url === "about:blank" ? "running" : "starting"
  };
}
