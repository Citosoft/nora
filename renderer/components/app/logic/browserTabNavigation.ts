import { getBrowserTabTitle, getCurrentBrowserUrl, normalizeBrowserUrl } from "@/components/app/logic/browserTabs";
import type { BrowserTabState } from "@/components/app/types";

export function updateTabNavigationState(
  current: BrowserTabState,
  nextUrl: string,
  status: BrowserTabState["status"],
  title?: string
): BrowserTabState {
  const normalizedUrl = normalizeBrowserUrl(nextUrl) ?? nextUrl;
  const currentUrl = getCurrentBrowserUrl(current);
  const fallbackTitle = getBrowserTabTitle(normalizedUrl);
  const resolvedTitle =
    title?.trim() ||
    (currentUrl === normalizedUrl && current.title.trim() ? current.title : fallbackTitle);

  if (currentUrl === normalizedUrl) {
    return {
      ...current,
      title: resolvedTitle,
      status
    };
  }

  const nextIndex = current.historyIndex + 1;
  if (current.history[nextIndex] === normalizedUrl) {
    return {
      ...current,
      title: resolvedTitle,
      historyIndex: nextIndex,
      status
    };
  }

  const previousIndex = current.historyIndex - 1;
  if (previousIndex >= 0 && current.history[previousIndex] === normalizedUrl) {
    return {
      ...current,
      title: resolvedTitle,
      historyIndex: previousIndex,
      status
    };
  }

  const nextHistory = current.history.slice(0, current.historyIndex + 1);
  nextHistory.push(normalizedUrl);
  return {
    ...current,
    title: resolvedTitle,
    history: nextHistory,
    historyIndex: nextHistory.length - 1,
    status
  };
}

export function markBrowserTabLoadStopped(current: BrowserTabState, title?: string): BrowserTabState {
  const resolvedTitle =
    title?.trim() ||
    current.title.trim() ||
    getBrowserTabTitle(getCurrentBrowserUrl(current));

  return {
    ...current,
    title: resolvedTitle,
    status: "running"
  };
}
