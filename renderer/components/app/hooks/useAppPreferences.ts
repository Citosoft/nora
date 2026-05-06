import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import {
  readStoredAccentColor,
  readStoredDefaultIdeId,
  readStoredForceMacTitleBarPreview,
  readStoredGithubAccountLabel,
  readStoredGithubToken,
  readStoredGitlabAccountLabel,
  readStoredGitlabHost,
  readStoredGitlabToken,
  readStoredTerminalFontId,
  readStoredTerminalThemeId,
  readStoredThemeMode,
  readStoredUiFontId,
  readStoredUserDisplayName,
  readStoredVercelAccountLabel,
  readStoredVercelToken,
  readStoredVercelWorkspaceLinks,
  writeStoredAccentColor,
  writeStoredAccountLabel,
  writeStoredDefaultIdeId,
  writeStoredForceMacTitleBarPreview,
  writeStoredGithubToken,
  writeStoredGitlabHost,
  writeStoredGitlabToken,
  writeStoredTerminalFontId,
  writeStoredTerminalThemeId,
  writeStoredThemeMode,
  writeStoredUiFontId,
  writeStoredUserDisplayName,
  writeStoredVercelToken,
  writeStoredVercelWorkspaceLinks
} from "@/components/app/logic/appPersistence";
import { applyAccentColor, applyTheme, applyUiFont, resolveThemeMode } from "@/components/app/logic/appTheme";
import type {
  AccentColor,
  ResolvedTheme,
  StoredVercelWorkspaceLinks,
  TerminalFontId,
  TerminalThemeId,
  ThemeMode,
  UiFontId
} from "@/components/app/types";
import type { AppPreferences } from "@/components/app/types/component.types";
import { DEFAULT_APP_SETTINGS, type AiProvider, type AppSettings } from "@shared/appTypes";
import { useEffect, useRef, useState } from "react";

function normalizeAppSettings(candidate: AppSettings): AppSettings {
  const preferredProvider =
    candidate.ai?.preferredProvider === "openai" ||
    candidate.ai?.preferredProvider === "google" ||
    candidate.ai?.preferredProvider === "anthropic"
      ? candidate.ai.preferredProvider
      : DEFAULT_APP_SETTINGS.ai.preferredProvider;

  return {
    ...DEFAULT_APP_SETTINGS,
    ...candidate,
    terminalQuickLaunchDefaults: {
      ...DEFAULT_APP_SETTINGS.terminalQuickLaunchDefaults,
      ...candidate.terminalQuickLaunchDefaults
    },
    terminalPresets: Array.isArray(candidate.terminalPresets) ? candidate.terminalPresets : DEFAULT_APP_SETTINGS.terminalPresets,
    ai: {
      preferredProvider,
      apiKeys: {
        ...DEFAULT_APP_SETTINGS.ai.apiKeys,
        ...(candidate.ai?.apiKeys ?? {})
      },
      modelByProvider: {
        ...DEFAULT_APP_SETTINGS.ai.modelByProvider,
        ...(candidate.ai?.modelByProvider ?? {})
      }
    }
  };
}

export function useAppPreferences(): AppPreferences {
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [accentColor, setAccentColor] = useState<AccentColor>("silver");
  const [terminalThemeId, setTerminalThemeId] = useState<TerminalThemeId>("app");
  const [terminalFontId, setTerminalFontId] = useState<TerminalFontId>("ibm-plex-mono");
  const [uiFontId, setUiFontId] = useState<UiFontId>("inter");
  const [defaultIdeId, setDefaultIdeId] = useState<string | null>(null);
  const [forceMacTitleBarPreview, setForceMacTitleBarPreview] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [gitlabToken, setGitlabToken] = useState("");
  const [gitlabHost, setGitlabHost] = useState("");
  const [vercelToken, setVercelToken] = useState("");
  const [githubAccountLabel, setGithubAccountLabel] = useState<string | null>(null);
  const [gitlabAccountLabel, setGitlabAccountLabel] = useState<string | null>(null);
  const [vercelAccountLabel, setVercelAccountLabel] = useState<string | null>(null);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");
  const [vercelWorkspaceLinks, setVercelWorkspaceLinks] = useState<StoredVercelWorkspaceLinks>({});
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isAppSettingsLoaded, setIsAppSettingsLoaded] = useState(false);
  const appSettingsRef = useRef(appSettings);
  const appSettingsSaveChainRef = useRef<Promise<void>>(Promise.resolve());
  const appSettingsSaveVersionRef = useRef(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const storedMode = readStoredThemeMode();
    const storedAccentColor = readStoredAccentColor();
    const storedTerminalThemeId = readStoredTerminalThemeId();
    const storedTerminalFontId = readStoredTerminalFontId();
    const storedUiFontId = readStoredUiFontId();
    const storedDefaultIdeId = readStoredDefaultIdeId();
    const storedForceMacTitleBarPreview = readStoredForceMacTitleBarPreview();
    const storedUserDisplayName = readStoredUserDisplayName();
    const storedGithubToken = readStoredGithubToken();
    const storedGitlabToken = readStoredGitlabToken();
    const storedGitlabHost = readStoredGitlabHost();
    const storedVercelToken = readStoredVercelToken();
    const storedGithubAccountLabel = readStoredGithubAccountLabel();
    const storedGitlabAccountLabel = readStoredGitlabAccountLabel();
    const storedVercelAccountLabel = readStoredVercelAccountLabel();
    const storedVercelWorkspaceLinks = readStoredVercelWorkspaceLinks();

    setThemeMode(storedMode);
    setAccentColor(storedAccentColor);
    setTerminalThemeId(storedTerminalThemeId);
    setTerminalFontId(storedTerminalFontId);
    setUiFontId(storedUiFontId);
    setDefaultIdeId(storedDefaultIdeId);
    setForceMacTitleBarPreview(storedForceMacTitleBarPreview);
    setUserDisplayName(storedUserDisplayName);
    setGithubToken(storedGithubToken);
    setGitlabToken(storedGitlabToken);
    setGitlabHost(storedGitlabHost);
    setVercelToken(storedVercelToken);
    setVercelWorkspaceLinks(storedVercelWorkspaceLinks);
    setGithubAccountLabel(storedGithubAccountLabel);
    setGitlabAccountLabel(storedGitlabAccountLabel);
    setVercelAccountLabel(storedVercelAccountLabel);
    setResolvedTheme(applyTheme(storedMode, storedAccentColor));
    applyUiFont(storedUiFontId);

    const handleSystemThemeChange = () => {
      setResolvedTheme(applyTheme(readStoredThemeMode(), readStoredAccentColor()));
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    if (readStoredUserDisplayName().trim()) {
      return;
    }

    noraSystemClient.getDetectedUserIdentity().then((identity) => {
      const nextDisplayName = identity.displayName?.trim() || "";
      if (!nextDisplayName) {
        return;
      }

      writeStoredUserDisplayName(nextDisplayName);
      setUserDisplayName(nextDisplayName);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    noraSystemClient.getAppSettings().then((nextSettings) => {
      setAppSettings(normalizeAppSettings(nextSettings));
    }).catch(() => {
      setAppSettings(DEFAULT_APP_SETTINGS);
    }).finally(() => {
      setIsAppSettingsLoaded(true);
    });
  }, []);

  useEffect(() => {
    appSettingsRef.current = appSettings;
  }, [appSettings]);

  const toggleTheme = () => {
    const nextMode: ThemeMode = resolvedTheme === "dark" ? "light" : "dark";
    writeStoredThemeMode(nextMode);
    setThemeMode(nextMode);
    setResolvedTheme(applyTheme(nextMode, accentColor));
  };

  const updateThemeMode = (nextMode: ThemeMode) => {
    writeStoredThemeMode(nextMode);
    setThemeMode(nextMode);
    setResolvedTheme(applyTheme(nextMode, accentColor));
  };

  const updateAccentColor = (nextAccentColor: AccentColor) => {
    writeStoredAccentColor(nextAccentColor);
    setAccentColor(nextAccentColor);
    applyAccentColor(nextAccentColor, resolveThemeMode(themeMode, resolvedTheme));
  };

  const updateTerminalTheme = (nextThemeId: TerminalThemeId) => {
    writeStoredTerminalThemeId(nextThemeId);
    setTerminalThemeId(nextThemeId);
  };

  const updateTerminalFont = (nextFontId: TerminalFontId) => {
    writeStoredTerminalFontId(nextFontId);
    setTerminalFontId(nextFontId);
  };

  const updateUiFont = (nextUiFontId: UiFontId) => {
    writeStoredUiFontId(nextUiFontId);
    setUiFontId(nextUiFontId);
    applyUiFont(nextUiFontId);
  };

  const updateDefaultIde = (nextIdeId: string | null) => {
    writeStoredDefaultIdeId(nextIdeId);
    setDefaultIdeId(nextIdeId);
  };

  const updateForceMacTitleBarPreview = (enabled: boolean) => {
    writeStoredForceMacTitleBarPreview(enabled);
    setForceMacTitleBarPreview(enabled);
  };

  const updateUserDisplayName = (nextDisplayName: string) => {
    writeStoredUserDisplayName(nextDisplayName);
    setUserDisplayName(nextDisplayName.trim());
  };

  const updateGithubToken = (nextToken: string) => {
    writeStoredGithubToken(nextToken);
    setGithubToken(nextToken);
  };

  const updateGitlabToken = (nextToken: string) => {
    writeStoredGitlabToken(nextToken);
    setGitlabToken(nextToken);
  };

  const updateGitlabHost = (nextHost: string) => {
    writeStoredGitlabHost(nextHost);
    setGitlabHost(nextHost.trim());
  };

  const updateVercelToken = (nextToken: string) => {
    writeStoredVercelToken(nextToken);
    setVercelToken(nextToken);
  };

  const updateVercelWorkspaceLinks = (nextLinks: StoredVercelWorkspaceLinks) => {
    writeStoredVercelWorkspaceLinks(nextLinks);
    setVercelWorkspaceLinks(nextLinks);
  };

  const updateGithubAccountLabel = (nextLabel: string | null) => {
    writeStoredAccountLabel("github", nextLabel);
    setGithubAccountLabel(nextLabel);
  };

  const updateGitlabAccountLabel = (nextLabel: string | null) => {
    writeStoredAccountLabel("gitlab", nextLabel);
    setGitlabAccountLabel(nextLabel);
  };

  const updateVercelAccountLabel = (nextLabel: string | null) => {
    writeStoredAccountLabel("vercel", nextLabel);
    setVercelAccountLabel(nextLabel);
  };

  const saveAppSettings = async (updater: (current: AppSettings) => AppSettings) => {
    const nextSettings = normalizeAppSettings(updater(appSettingsRef.current));
    appSettingsRef.current = nextSettings;
    setAppSettings(nextSettings);

    const saveVersion = ++appSettingsSaveVersionRef.current;
    const saveTask = appSettingsSaveChainRef.current
      .catch(() => undefined)
      .then(() => noraSystemClient.saveAppSettings(nextSettings));
    appSettingsSaveChainRef.current = saveTask.then(() => undefined, () => undefined);
    const savedSettings = normalizeAppSettings(await saveTask);

    if (saveVersion === appSettingsSaveVersionRef.current) {
      appSettingsRef.current = savedSettings;
      setAppSettings(savedSettings);
    }
  };

  const updateHardwareAccelerationEnabled = async (enabled: boolean) => {
    await saveAppSettings((current) => ({
      ...current,
      hardwareAccelerationEnabled: enabled
    }));
  };

  const updateFileEditorThemeId = async (fileEditorThemeId: AppSettings["fileEditorThemeId"]) => {
    await saveAppSettings((current) => ({
      ...current,
      fileEditorThemeId
    }));
  };

  const updateWorkspaceStateStorageMode = async (workspaceStateStorageMode: AppSettings["workspaceStateStorageMode"]) => {
    await saveAppSettings((current) => ({
      ...current,
      workspaceStateStorageMode
    }));
  };

  const updateDefaultAgentLaunchTarget = async (defaultAgentLaunchTarget: AppSettings["defaultAgentLaunchTarget"]) => {
    await saveAppSettings((current) => ({
      ...current,
      defaultAgentLaunchTarget
    }));
  };

  const updateLinuxAptSetupPromptDismissed = async (dismissed: boolean) => {
    await saveAppSettings((current) => ({
      ...current,
      linuxAptSetupPromptDismissed: dismissed
    }));
  };

  const updateSplitViewPreferences = async (
    nextSplitViewSettings: Pick<
      AppSettings,
      | "defaultSplitViewGridColumns"
      | "defaultSplitViewGridRows"
      | "rememberLastSplitViewPerWorkspace"
      | "confirmSplitViewDelete"
      | "showWorkspaceSessionTabs"
    >
  ) => {
    await saveAppSettings((current) => ({
      ...current,
      ...nextSplitViewSettings
    }));
  };

  const updateBrowserPreferences = async (
    nextBrowserSettings: Partial<Pick<
      AppSettings,
      "openInternalBrowserOnNewPortDetection" | "browserDataImportPromptSeen"
    >>
  ) => {
    await saveAppSettings((current) => ({
      ...current,
      ...nextBrowserSettings
    }));
  };

  const updateNotificationPreferences = async (
    nextNotificationSettings: Pick<
      AppSettings,
      "agentCompletionNotificationsEnabled"
    >
  ) => {
    await saveAppSettings((current) => ({
      ...current,
      ...nextNotificationSettings
    }));
  };

  const updateAnalyticsConsentStatus = async (
    analyticsConsentStatus: AppSettings["analyticsConsentStatus"]
  ) => {
    await saveAppSettings((current) => ({
      ...current,
      analyticsConsentStatus
    }));
  };

  const updateTerminalPresets = async (terminalPresets: AppSettings["terminalPresets"]) => {
    await saveAppSettings((current) => ({
      ...current,
      terminalPresets
    }));
  };

  const updateTerminalQuickLaunchDefaults = async (
    terminalQuickLaunchDefaults: AppSettings["terminalQuickLaunchDefaults"]
  ) => {
    await saveAppSettings((current) => ({
      ...current,
      terminalQuickLaunchDefaults
    }));
  };

  const updateAiPreferredProvider = async (provider: AiProvider) => {
    await saveAppSettings((current) => ({
      ...current,
      ai: {
        ...current.ai,
        preferredProvider: provider
      }
    }));
  };

  const updateAiApiKey = async (provider: AiProvider, apiKey: string) => {
    await saveAppSettings((current) => ({
      ...current,
      ai: {
        ...current.ai,
        apiKeys: {
          ...current.ai.apiKeys,
          [provider]: apiKey
        }
      }
    }));
  };

  const updateAiModel = async (provider: AiProvider, model: string) => {
    await saveAppSettings((current) => ({
      ...current,
      ai: {
        ...current.ai,
        modelByProvider: {
          ...current.ai.modelByProvider,
          [provider]: model
        }
      }
    }));
  };

  const relaunchApplication = async () => {
    await noraSystemClient.relaunchApplication({
      hardwareAccelerationEnabled: appSettingsRef.current.hardwareAccelerationEnabled
    });
  };

  return {
    themeMode,
    accentColor,
    terminalThemeId,
    terminalFontId,
    uiFontId,
    defaultIdeId,
    forceMacTitleBarPreview,
    userDisplayName,
    githubToken,
    gitlabToken,
    gitlabHost,
    vercelToken,
    githubAccountLabel,
    gitlabAccountLabel,
    vercelAccountLabel,
    resolvedTheme,
    vercelWorkspaceLinks,
    appSettings,
    isAppSettingsLoaded,
    toggleTheme,
    updateThemeMode,
    updateAccentColor,
    updateTerminalTheme,
    updateTerminalFont,
    updateUiFont,
    updateDefaultIde,
    updateForceMacTitleBarPreview,
    updateUserDisplayName,
    updateGithubToken,
    updateGitlabToken,
    updateGitlabHost,
    updateVercelToken,
    updateVercelWorkspaceLinks,
    updateGithubAccountLabel,
    updateGitlabAccountLabel,
    updateVercelAccountLabel,
    updateFileEditorThemeId,
    updateHardwareAccelerationEnabled,
    updateWorkspaceStateStorageMode,
    updateDefaultAgentLaunchTarget,
    updateLinuxAptSetupPromptDismissed,
    updateSplitViewPreferences,
    updateBrowserPreferences,
    updateNotificationPreferences,
    updateAnalyticsConsentStatus,
    updateTerminalPresets,
    updateTerminalQuickLaunchDefaults,
    updateAiPreferredProvider,
    updateAiApiKey,
    updateAiModel,
    relaunchApplication
  };
}
