import {
  DEFAULT_APP_SETTINGS,
  type AiSettings,
  type AppSettings,
  type TerminalPreset,
  type TerminalQuickLaunchDefaults,
  type VoiceSettings
} from "@shared/appTypes";
import { safeStorage } from "electron";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { isNodeError } from "./nodeErrors";

const ENCRYPTED_SECRET_PREFIX = "enc:v1:";

export class AppSettingsStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<AppSettings> {
    try {
      const raw = await fsPromises.readFile(this.filePath, "utf8");
      return parseAppSettings(raw);
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return DEFAULT_APP_SETTINGS;
      }
      throw error;
    }
  }

  async save(nextSettings: AppSettings): Promise<AppSettings> {
    await fsPromises.mkdir(path.dirname(this.filePath), { recursive: true });
    const toPersist = redactAndEncryptSecrets(nextSettings);
    await fsPromises.writeFile(this.filePath, JSON.stringify(toPersist, null, 2), "utf8");
    return nextSettings;
  }
}

function parseAppSettings(raw: string): AppSettings {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return DEFAULT_APP_SETTINGS;
    }

    const candidate = parsed as Partial<AppSettings>;
    const decryptedAiSettings = parseAiSettings(candidate.ai);
    const voiceSettings = parseVoiceSettings(candidate.voice);
    return {
      hardwareAccelerationEnabled: candidate.hardwareAccelerationEnabled !== false,
      workspaceStateStorageMode:
        candidate.workspaceStateStorageMode === "home" || candidate.workspaceStateStorageMode === "repo"
          ? candidate.workspaceStateStorageMode
          : DEFAULT_APP_SETTINGS.workspaceStateStorageMode,
      defaultAgentLaunchTarget:
        candidate.defaultAgentLaunchTarget === "current-branch" ||
        candidate.defaultAgentLaunchTarget === "new" ||
        candidate.defaultAgentLaunchTarget === "existing" ||
        candidate.defaultAgentLaunchTarget === "branch-existing" ||
        candidate.defaultAgentLaunchTarget === "branch-new"
          ? candidate.defaultAgentLaunchTarget
          : DEFAULT_APP_SETTINGS.defaultAgentLaunchTarget,
      preferredAgentToolId:
        typeof candidate.preferredAgentToolId === "string" && candidate.preferredAgentToolId.trim().length > 0
          ? candidate.preferredAgentToolId
          : null,
      defaultSplitViewGridColumns:
        candidate.defaultSplitViewGridColumns === 1 ||
        candidate.defaultSplitViewGridColumns === 2 ||
        candidate.defaultSplitViewGridColumns === 3 ||
        candidate.defaultSplitViewGridColumns === 4
          ? candidate.defaultSplitViewGridColumns
          : DEFAULT_APP_SETTINGS.defaultSplitViewGridColumns,
      defaultSplitViewGridRows:
        candidate.defaultSplitViewGridRows === 1 || candidate.defaultSplitViewGridRows === 2
          ? candidate.defaultSplitViewGridRows
          : DEFAULT_APP_SETTINGS.defaultSplitViewGridRows,
      rememberLastSplitViewPerWorkspace: candidate.rememberLastSplitViewPerWorkspace !== false,
      confirmSplitViewDelete: candidate.confirmSplitViewDelete !== false,
      showWorkspaceSessionTabs: candidate.showWorkspaceSessionTabs !== false,
      agentCompletionNotificationsEnabled: candidate.agentCompletionNotificationsEnabled !== false,
      analyticsConsentStatus:
        candidate.analyticsConsentStatus === "granted" || candidate.analyticsConsentStatus === "declined"
          ? candidate.analyticsConsentStatus
          : DEFAULT_APP_SETTINGS.analyticsConsentStatus,
      openInternalBrowserOnNewPortDetection: candidate.openInternalBrowserOnNewPortDetection === true,
      browserDataImportPromptSeen: candidate.browserDataImportPromptSeen === true,
      linuxAptSetupPromptDismissed: candidate.linuxAptSetupPromptDismissed === true,
      fileEditorThemeId:
        candidate.fileEditorThemeId === "high-contrast"
          ? candidate.fileEditorThemeId
          : DEFAULT_APP_SETTINGS.fileEditorThemeId,
      terminalQuickLaunchDefaults: parseTerminalQuickLaunchDefaults(candidate.terminalQuickLaunchDefaults),
      terminalPresets: parseTerminalPresets(candidate.terminalPresets),
      ai: decryptedAiSettings,
      voice: voiceSettings
    };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

function parseVoiceSettings(candidate: AppSettings["voice"] | undefined): VoiceSettings {
  if (!candidate || typeof candidate !== "object") {
    return DEFAULT_APP_SETTINGS.voice;
  }

  const parsedSettings = candidate as Partial<VoiceSettings>;
  const dictationProvider =
    parsedSettings.dictationProvider === "openai" || parsedSettings.dictationProvider === "localWhisper"
      ? parsedSettings.dictationProvider
      : DEFAULT_APP_SETTINGS.voice.dictationProvider;
  const localWhisperModelId =
    parsedSettings.localWhisperModelId === "tiny.en" || parsedSettings.localWhisperModelId === "base.en"
      ? parsedSettings.localWhisperModelId
      : DEFAULT_APP_SETTINGS.voice.localWhisperModelId;

  return {
    dictationProvider,
    localWhisperModelId
  };
}

function parseAiSettings(candidate: AppSettings["ai"] | undefined): AiSettings {
  if (!candidate || typeof candidate !== "object") {
    return DEFAULT_APP_SETTINGS.ai;
  }

  const parsedSettings = candidate as Partial<AiSettings>;
  const preferredProvider =
    parsedSettings.preferredProvider === "openai" ||
    parsedSettings.preferredProvider === "google" ||
    parsedSettings.preferredProvider === "anthropic"
      ? parsedSettings.preferredProvider
      : DEFAULT_APP_SETTINGS.ai.preferredProvider;

  const rawApiKeys = parsedSettings.apiKeys;
  const apiKeys = rawApiKeys && typeof rawApiKeys === "object"
    ? {
        openai: decryptSecretIfNeeded(typeof rawApiKeys.openai === "string" ? rawApiKeys.openai : ""),
        google: decryptSecretIfNeeded(typeof rawApiKeys.google === "string" ? rawApiKeys.google : ""),
        anthropic: decryptSecretIfNeeded(typeof rawApiKeys.anthropic === "string" ? rawApiKeys.anthropic : "")
      }
    : DEFAULT_APP_SETTINGS.ai.apiKeys;

  const rawModelByProvider = parsedSettings.modelByProvider;
  const modelByProvider = rawModelByProvider && typeof rawModelByProvider === "object"
    ? {
        openai: typeof rawModelByProvider.openai === "string"
          ? rawModelByProvider.openai
          : DEFAULT_APP_SETTINGS.ai.modelByProvider.openai,
        google: typeof rawModelByProvider.google === "string"
          ? rawModelByProvider.google
          : DEFAULT_APP_SETTINGS.ai.modelByProvider.google,
        anthropic: typeof rawModelByProvider.anthropic === "string"
          ? rawModelByProvider.anthropic
          : DEFAULT_APP_SETTINGS.ai.modelByProvider.anthropic
      }
    : DEFAULT_APP_SETTINGS.ai.modelByProvider;

  const simpleTaskProvider =
    parsedSettings.simpleTaskProvider === "cloud" || parsedSettings.simpleTaskProvider === "local"
      ? parsedSettings.simpleTaskProvider
      : DEFAULT_APP_SETTINGS.ai.simpleTaskProvider;
  const localLlmModelId =
    parsedSettings.localLlmModelId === "qwen2.5-0.5b-instruct" || parsedSettings.localLlmModelId === "smollm2-360m-instruct"
      ? parsedSettings.localLlmModelId
      : DEFAULT_APP_SETTINGS.ai.localLlmModelId;

  return {
    preferredProvider,
    apiKeys,
    modelByProvider,
    simpleTaskProvider,
    localLlmModelId
  };
}

function redactAndEncryptSecrets(settings: AppSettings): AppSettings {
  return {
    ...settings,
    ai: {
      ...settings.ai,
      apiKeys: {
        openai: encryptSecretIfAvailable(settings.ai.apiKeys.openai),
        google: encryptSecretIfAvailable(settings.ai.apiKeys.google),
        anthropic: encryptSecretIfAvailable(settings.ai.apiKeys.anthropic)
      }
    }
  };
}

function encryptSecretIfAvailable(secret: string): string {
  if (!secret || !safeStorage.isEncryptionAvailable()) {
    return secret;
  }
  return `${ENCRYPTED_SECRET_PREFIX}${safeStorage.encryptString(secret).toString("base64")}`;
}

function decryptSecretIfNeeded(secret: string): string {
  if (!secret.startsWith(ENCRYPTED_SECRET_PREFIX)) {
    return secret;
  }
  if (!safeStorage.isEncryptionAvailable()) {
    return "";
  }
  const encoded = secret.slice(ENCRYPTED_SECRET_PREFIX.length);
  if (!encoded) {
    return "";
  }
  try {
    return safeStorage.decryptString(Buffer.from(encoded, "base64"));
  } catch {
    return "";
  }
}

function parseTerminalQuickLaunchDefaults(
  candidate: AppSettings["terminalQuickLaunchDefaults"] | undefined
): TerminalQuickLaunchDefaults {
  if (!candidate || typeof candidate !== "object") {
    return DEFAULT_APP_SETTINGS.terminalQuickLaunchDefaults;
  }

  const parsedDefaults = candidate as Partial<TerminalQuickLaunchDefaults>;
  const name = typeof parsedDefaults.name === "string" ? parsedDefaults.name : DEFAULT_APP_SETTINGS.terminalQuickLaunchDefaults.name;
  const target =
    parsedDefaults.target === "root" || parsedDefaults.target === "session-default"
      ? parsedDefaults.target
      : DEFAULT_APP_SETTINGS.terminalQuickLaunchDefaults.target;

  return {
    name,
    target
  };
}

function parseTerminalPresets(candidate: AppSettings["terminalPresets"] | undefined): TerminalPreset[] {
  if (!Array.isArray(candidate)) {
    return DEFAULT_APP_SETTINGS.terminalPresets;
  }

  return candidate.flatMap((preset) => {
    if (!preset || typeof preset !== "object") {
      return [];
    }

    const parsedPreset = preset as Partial<TerminalPreset>;
    const id = typeof parsedPreset.id === "string" ? parsedPreset.id.trim() : "";
    const name = typeof parsedPreset.name === "string" ? parsedPreset.name.trim() : "";
    const shellId =
      typeof parsedPreset.shellId === "string"
        ? parsedPreset.shellId.trim() || null
        : null;
    const workingDirectory =
      typeof parsedPreset.workingDirectory === "string"
        ? parsedPreset.workingDirectory
        : "";
    const commands = Array.isArray(parsedPreset.commands)
      ? parsedPreset.commands.filter((command): command is string => typeof command === "string")
      : [];

    if (!id || !name) {
      return [];
    }

    return [{
      id,
      name,
      shellId,
      workingDirectory,
      commands
    }];
  });
}
