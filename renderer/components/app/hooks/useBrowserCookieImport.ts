import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { UseBrowserCookieImportArgs, UseBrowserCookieImportResult } from "@/components/app/types/appHooks.types";
import type { BrowserCookieProfileSummary, BrowserDataImportResult } from "@shared/appTypes";
import { useCallback, useEffect, useState } from "react";

export function useBrowserCookieImport({
  activeView,
  focusedBrowserTabId,
  browserDataImportPromptSeen,
  updateBrowserPreferences,
  captureError,
  flashStatus,
  statusBar
}: UseBrowserCookieImportArgs): UseBrowserCookieImportResult {
  const [chromeCookieProfiles, setChromeCookieProfiles] = useState<BrowserCookieProfileSummary[]>([]);
  const [selectedChromeCookieProfileId, setSelectedChromeCookieProfileId] = useState<string | null>(null);
  const [isLoadingChromeCookieProfiles, setIsLoadingChromeCookieProfiles] = useState(false);
  const [isBrowserCookieImportPromptOpen, setIsBrowserCookieImportPromptOpen] = useState(false);
  const [isImportingChromeBrowserData, setIsImportingChromeBrowserData] = useState(false);

  const loadChromeCookieProfiles = useCallback((): void => {
    setIsLoadingChromeCookieProfiles(true);
    void noraSystemClient.listChromeCookieProfiles().then((profiles) => {
      setChromeCookieProfiles(profiles);
      setSelectedChromeCookieProfileId((current) => {
        if (current && profiles.some((profile) => profile.id === current)) {
          return current;
        }
        return profiles[0]?.id ?? null;
      });
    }).catch(captureError).finally(() => {
      setIsLoadingChromeCookieProfiles(false);
    });
  }, [captureError]);

  const runChromeBrowserDataImport = useCallback(async (profileId: string): Promise<BrowserDataImportResult | null> => {
    setIsImportingChromeBrowserData(true);
    const statusId = statusBar.beginStatus("Importing Chrome cookies", true);
    try {
      const result = await noraSystemClient.importChromeBrowserData(profileId);
      void updateBrowserPreferences({
        browserDataImportPromptSeen: true
      }).catch(captureError);

      if (result.ok) {
        const domainSummary = result.domains.length
          ? ` across ${result.domains.length} domain${result.domains.length === 1 ? "" : "s"}`
          : "";
        flashStatus(`Imported ${result.importedCookies} Chrome cookie${result.importedCookies === 1 ? "" : "s"}${domainSummary}`);
        return result;
      }

      flashStatus(result.reason, 4_000);
      return result;
    } catch (error: unknown) {
      captureError(error);
      return null;
    } finally {
      setIsImportingChromeBrowserData(false);
      statusBar.endStatus(statusId);
    }
  }, [captureError, flashStatus, statusBar, updateBrowserPreferences]);

  const handleImportChromeBrowserData = useCallback((profileId: string): void => {
    void runChromeBrowserDataImport(profileId);
  }, [runChromeBrowserDataImport]);

  useEffect(() => {
    if (activeView !== "settings") {
      return;
    }
    loadChromeCookieProfiles();
  }, [activeView, loadChromeCookieProfiles]);

  useEffect(() => {
    if (browserDataImportPromptSeen) {
      if (isBrowserCookieImportPromptOpen) {
        setIsBrowserCookieImportPromptOpen(false);
      }
      return;
    }
    if (!focusedBrowserTabId || isBrowserCookieImportPromptOpen) {
      return;
    }
    setIsBrowserCookieImportPromptOpen(true);
    if (!chromeCookieProfiles.length && !isLoadingChromeCookieProfiles) {
      loadChromeCookieProfiles();
    }
  }, [
    browserDataImportPromptSeen,
    chromeCookieProfiles.length,
    focusedBrowserTabId,
    isBrowserCookieImportPromptOpen,
    isLoadingChromeCookieProfiles,
    loadChromeCookieProfiles
  ]);

  return {
    chromeCookieProfiles,
    selectedChromeCookieProfileId,
    isLoadingChromeCookieProfiles,
    isBrowserCookieImportPromptOpen,
    isImportingChromeBrowserData,
    setSelectedChromeCookieProfileId,
    setIsBrowserCookieImportPromptOpen,
    loadChromeCookieProfiles,
    runChromeBrowserDataImport,
    handleImportChromeBrowserData
  };
}
