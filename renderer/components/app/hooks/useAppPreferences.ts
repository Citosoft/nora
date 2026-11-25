import { normalizeUiFontSize } from "@shared/appearance/fontSize";
import { useAgentWindowSettings } from "@/components/app/hooks/useAgentWindowSettings";
import { normalizeAppSettings } from "@/components/app/logic/normalizeAppSettings";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import {
  readStoredAccentColor,
  readStoredColorTheme,
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
  readStoredThemeSelection,
  readStoredUiFontId,
  readStoredVercelAccountLabel,
  readStoredVercelToken,
  readStoredVercelWorkspaceLinks,
  writeStoredAccentColor,
  writeStoredAccountLabel,
  writeStoredColorTheme,
  writeStoredDefaultIdeId,
  writeStoredForceMacTitleBarPreview,
  writeStoredGithubToken,
  writeStoredGitlabHost,
  writeStoredGitlabToken,
  writeStoredTerminalFontId,
  writeStoredTerminalThemeId,
  writeStoredThemeMode,
  writeStoredUiFontId,
  writeStoredVercelToken,
  writeStoredVercelWorkspaceLinks
} from "@/components/app/logic/appPersistence";
import { applyTheme, applyUiFont } from "@/components/app/logic/appTheme";
import { DEFAULT_UI_FONT_ID } from "@/components/app/logic/appUiFonts";
import { readUserDisplayName, writeUserDisplayName } from "@/components/app/logic/userDisplayName";
import { useUserDisplayName } from "@/components/app/hooks/useUserDisplayName";
import { useSyncedAppearance } from "@/components/app/hooks/useSyncedAppearance";
import { mergeAppPreferences } from "@/components/app/logic/account/syncedPreferences";
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
import type { NotificationPreferencesUpdate } from "@/components/app/types/settings.types";
import type { ColorThemeId } from "@shared/types/appearance/colorTheme.types";
import { DEFAULT_COLOR_THEME_ID } from "@shared/appearance/colorThemes";
import { DEFAULT_ACCENT_COLOR } from "@shared/appearance/accentColors";
import { DEFAULT_APP_SETTINGS, type AiProvider, type AiSimpleTaskSettings, type AppSettings } from "@shared/appTypes";
import { useEffect, useRef, useState } from "react";

export function useAppPreferences(): AppPreferences {
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [accentColor, setAccentColor] = useState<AccentColor>(DEFAULT_ACCENT_COLOR);
  const [colorTheme, setColorTheme] = useState<ColorThemeId>(DEFAULT_COLOR_THEME_ID);
  const [terminalThemeId, setTerminalThemeId] = useState<TerminalThemeId>("app");
  const [terminalFontId, setTerminalFontId] = useState<TerminalFontId>("ibm-plex-mono");
  const [uiFontId, setUiFontId] = useState<UiFontId>(DEFAULT_UI_FONT_ID);
  const [defaultIdeId, setDefaultIdeId] = useState<string | null>(null);
  const [forceMacTitleBarPreview, setForceMacTitleBarPreview] = useState(false);
  const userDisplayName = useUserDisplayName();
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
  useEffect(() => noraSystemClient.onAppSettingsChanged((settings) => {
    appSettingsRef.current = settings;
    setAppSettings(settings);
  }), []);
  const [appearanceLoaded, setAppearanceLoaded] = useState(false);
  useSyncedAppearance({ loaded: appearanceLoaded && isAppSettingsLoaded,
    appearance: { themeMode, colorTheme, accentColor, terminalThemeId, terminalFontId, uiFontId, userDisplayName },
    apply(next) {
      writeStoredThemeMode(next.themeMode); writeStoredColorTheme(next.colorTheme); writeStoredAccentColor(next.accentColor); writeStoredTerminalThemeId(next.terminalThemeId);
      writeStoredTerminalFontId(next.terminalFontId); writeStoredUiFontId(next.uiFontId); writeUserDisplayName(next.userDisplayName);
      setThemeMode(next.themeMode); setColorTheme(next.colorTheme); setAccentColor(next.accentColor); setTerminalThemeId(next.terminalThemeId);
      setTerminalFontId(next.terminalFontId); setUiFontId(next.uiFontId);
      setResolvedTheme(applyTheme(next)); applyUiFont(next.uiFontId);
    },
    applySettings(values, expected) {
      const next = mergeAppPreferences(appSettingsRef.current, values, expected);
      appSettingsRef.current = next; setAppSettings(next);
    }
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const storedMode = readStoredThemeMode();
    const storedAccentColor = readStoredAccentColor();
    const storedColorTheme = readStoredColorTheme();
    const storedTerminalThemeId = readStoredTerminalThemeId();
    const storedTerminalFontId = readStoredTerminalFontId();
    const storedUiFontId = readStoredUiFontId();
    const storedDefaultIdeId = readStoredDefaultIdeId();
    const storedForceMacTitleBarPreview = readStoredForceMacTitleBarPreview();
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
    setColorTheme(storedColorTheme);
    setTerminalThemeId(storedTerminalThemeId);
    setTerminalFontId(storedTerminalFontId);
    setUiFontId(storedUiFontId);
    setDefaultIdeId(storedDefaultIdeId);
    setForceMacTitleBarPreview(storedForceMacTitleBarPreview);
    setGithubToken(storedGithubToken);
    setGitlabToken(storedGitlabToken);
    setGitlabHost(storedGitlabHost);
    setVercelToken(storedVercelToken);
    setVercelWorkspaceLinks(storedVercelWorkspaceLinks);
    setGithubAccountLabel(storedGithubAccountLabel);
    setGitlabAccountLabel(storedGitlabAccountLabel);
    setVercelAccountLabel(storedVercelAccountLabel);
    setResolvedTheme(applyTheme({ themeMode: storedMode, colorTheme: storedColorTheme, accentColor: storedAccentColor }));
    applyUiFont(storedUiFontId);
    setAppearanceLoaded(true);

    const handleSystemThemeChange = () => {
      setResolvedTheme(applyTheme(readStoredThemeSelection()));
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    if (readUserDisplayName()) {
      return;
    }

    noraSystemClient.getDetectedUserIdentity().then((identity) => {
      const nextDisplayName = identity.displayName?.trim() || "";
      if (!nextDisplayName || readUserDisplayName()) {
        return;
      }

      writeUserDisplayName(nextDisplayName);
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

  useEffect(() => {
    const size = normalizeUiFontSize(appSettings.uiFontSize);
    document.documentElement.style.setProperty("--app-ui-font-size", `${size / DEFAULT_APP_SETTINGS.uiFontSize * 100}%`);
  }, [appSettings.uiFontSize]);

  const toggleTheme = () => {
    const nextMode: ThemeMode = resolvedTheme === "dark" ? "light" : "dark";
    writeStoredThemeMode(nextMode);
    setThemeMode(nextMode);
    setResolvedTheme(applyTheme({ ...readStoredThemeSelection(), themeMode: nextMode }));
  };

  const updateThemeMode = (nextMode: ThemeMode) => {
    writeStoredThemeMode(nextMode);
    setThemeMode(nextMode);
    setResolvedTheme(applyTheme({ ...readStoredThemeSelection(), themeMode: nextMode }));
  };

  const updateAccentColor = (nextAccentColor: AccentColor) => {
    writeStoredAccentColor(nextAccentColor);
    setAccentColor(nextAccentColor);
    setResolvedTheme(applyTheme({ ...readStoredThemeSelection(), accentColor: nextAccentColor }));
  };

  // Picking a theme brings its own accent back, replacing any fixed accent chosen before.
  const updateColorTheme = (nextColorTheme: ColorThemeId) => {
    writeStoredColorTheme(nextColorTheme);
    writeStoredAccentColor("theme");
    setColorTheme(nextColorTheme);
    setAccentColor("theme");
    setResolvedTheme(applyTheme({ ...readStoredThemeSelection(), colorTheme: nextColorTheme, accentColor: "theme" }));
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

  const updateUserDisplayName = writeUserDisplayName;

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
    const baseline = appSettingsRef.current;
    const nextSettings = normalizeAppSettings(updater(baseline));
    appSettingsRef.current = nextSettings;
    setAppSettings(nextSettings);

    const saveVersion = ++appSettingsSaveVersionRef.current;
    const saveTask = appSettingsSaveChainRef.current
      .catch(() => undefined)
      .then(() => noraSystemClient.saveAppSettings(nextSettings, baseline));
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

  const updateUiFontSize = (uiFontSize: number) => saveAppSettings((current) => ({ ...current, uiFontSize: normalizeUiFontSize(uiFontSize) }));

  const updateThreadBackdrop = async (patch: Partial<AppSettings["threadBackdrop"]>) => {
    await saveAppSettings((current) => ({
      ...current,
      threadBackdrop: { ...current.threadBackdrop, ...patch }
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

  const updatePreferredAgentToolId = async (preferredAgentToolId: AppSettings["preferredAgentToolId"]) => {
    await saveAppSettings((current) => ({
      ...current,
      preferredAgentToolId
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

  const updateLifecycle = async (lifecycle: AppSettings["lifecycle"]) => {
    await saveAppSettings((current) => ({ ...current, lifecycle }));
  };

  const updateNotificationPreferences = async (
    nextNotificationSettings: NotificationPreferencesUpdate
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

  const updateVoiceSettings = async (voice: AppSettings["voice"]) => {
    await saveAppSettings((current) => ({
      ...current,
      voice
    }));
  };

  const updateAiSimpleTaskSettings = async (
    settings: AiSimpleTaskSettings
  ) => {
    await saveAppSettings((current) => ({
      ...current,
      ai: {
        ...current.ai,
        ...settings
      }
    }));
  };

  const relaunchApplication = async () => {
    await noraSystemClient.relaunchApplication({
      hardwareAccelerationEnabled: appSettingsRef.current.hardwareAccelerationEnabled
    });
  };

  useAgentWindowSettings({
    themeMode: updateThemeMode, colorTheme: updateColorTheme, accentColor: updateAccentColor, terminalThemeId: updateTerminalTheme,
    terminalFontId: updateTerminalFont, uiFontId: updateUiFont, userDisplayName: updateUserDisplayName,
    defaultIdeId: updateDefaultIde, forceMacTitleBarPreview: updateForceMacTitleBarPreview,
    githubToken: updateGithubToken, gitlabToken: updateGitlabToken, gitlabHost: updateGitlabHost, vercelToken: updateVercelToken,
    githubAccountLabel: updateGithubAccountLabel, gitlabAccountLabel: updateGitlabAccountLabel,
    vercelAccountLabel: updateVercelAccountLabel, vercelWorkspaceLinks: updateVercelWorkspaceLinks
  });

  return {
    themeMode,
    colorTheme,
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
    updateColorTheme,
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
    updateThreadBackdrop,
    updateUiFontSize,
    updateHardwareAccelerationEnabled,
    updateWorkspaceStateStorageMode,
    updateDefaultAgentLaunchTarget,
    updatePreferredAgentToolId,
    updateLinuxAptSetupPromptDismissed,
    updateSplitViewPreferences,
    updateBrowserPreferences,
    updateLifecycle,
    updateNotificationPreferences,
    updateAnalyticsConsentStatus,
    updateTerminalPresets,
    updateTerminalQuickLaunchDefaults,
    updateAiPreferredProvider,
    updateAiApiKey,
    updateAiModel,
    updateVoiceSettings,
    updateAiSimpleTaskSettings,
    relaunchApplication
  };
}
