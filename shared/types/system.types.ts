import type { AiSettings } from "./ai.types";
import type { AnalyticsConsentStatus } from "./analytics.types";

export type Screen = "project-selector" | "workspace";

export type AgentStatus =
  | "starting"
  | "running"
  | "stopped"
  | "idle"
  | "error";

export type AgentMode = "read" | "write";

export type TerminalStatus =
  | "starting"
  | "running"
  | "stopped"
  | "error";

export interface TerminalShellOption {
  id: string;
  label: string;
  executable: string;
}

export type InstallStatus =
  | "idle"
  | "running"
  | "installed"
  | "error";

export interface AgentAuthField {
  key: string;
  label: string;
  placeholder?: string;
  helpText?: string;
}

export interface AgentToolConfig {
  values: Record<string, string>;
  updatedAt: string | null;
}

export interface ToolUsageInfo {
  status: "available" | "unavailable" | "error";
  title: string;
  lines: string[];
  rawOutput?: string;
  fetchedAt: string;
}

export type ReleaseVersionStatus =
  | {
      kind: "error";
      currentVersion: string;
      message: string;
      releaseUrl: string;
    }
  | {
      kind: "up-to-date";
      currentVersion: string;
      latestVersion: string;
      releaseUrl: string;
    }
  | {
      kind: "available";
      currentVersion: string;
      latestVersion: string;
      releaseUrl: string;
    };

export type AutoUpdateStatus =
  | {
      kind: "unsupported";
      currentVersion: string;
      reason: string;
    }
  | {
      kind: "idle" | "checking" | "up-to-date";
      currentVersion: string;
      latestVersion: string | null;
    }
  | {
      kind: "downloading" | "downloaded";
      currentVersion: string;
      latestVersion: string | null;
      releaseNotes: string | null;
    }
  | {
      kind: "installing";
      currentVersion: string;
      latestVersion: string | null;
    }
  | {
      kind: "error";
      currentVersion: string;
      latestVersion: string | null;
      message: string;
    };

export type AutoUpdateTestTarget =
  | "idle"
  | "checking"
  | "downloading"
  | "downloaded"
  | "up-to-date"
  | "error";

export interface AutoUpdateTestSupport {
  enabled: boolean;
}

export type LinuxUpdateStatus =
  | {
      kind: "unsupported";
      currentVersion: string;
      updateCommand: string;
      reason: string;
    }
  | {
      kind: "error";
      currentVersion: string;
      updateCommand: string;
      message: string;
      releaseUrl: string;
    }
  | {
      kind: "up-to-date";
      currentVersion: string;
      latestVersion: string;
      updateCommand: string;
      releaseUrl: string;
    }
  | {
      kind: "available";
      currentVersion: string;
      latestVersion: string;
      updateCommand: string;
      releaseUrl: string;
    };

export type LinuxAptSetupStatus =
  | {
      kind: "unsupported";
      reason: string;
      repoUrl: string;
      sourceEntry: string;
      keyringPath: string;
      sourceListPath: string;
      manualCommands: string[];
    }
  | {
      kind: "configured";
      repoUrl: string;
      sourceEntry: string;
      keyringPath: string;
      sourceListPath: string;
      manualCommands: string[];
    }
  | {
      kind: "missing";
      repoUrl: string;
      sourceEntry: string;
      keyringPath: string;
      sourceListPath: string;
      pkexecAvailable: boolean;
      manualCommands: string[];
    };

export interface TerminalPreset {
  id: string;
  name: string;
  shellId?: string | null;
  workingDirectory: string;
  commands: string[];
}

export type TerminalQuickLaunchTarget = "session-default" | "root";

export interface TerminalQuickLaunchDefaults {
  name: string;
  target: TerminalQuickLaunchTarget;
}

export type WorkspaceStateStorageMode = "home" | "repo";
export type AgentLaunchTargetPreference =
  | "current-branch"
  | "new"
  | "existing"
  | "branch-existing"
  | "branch-new";

export interface AppSettings {
  hardwareAccelerationEnabled: boolean;
  workspaceStateStorageMode: WorkspaceStateStorageMode;
  defaultAgentLaunchTarget: AgentLaunchTargetPreference;
  defaultSplitViewGridColumns: 1 | 2 | 3 | 4;
  defaultSplitViewGridRows: 1 | 2;
  rememberLastSplitViewPerWorkspace: boolean;
  confirmSplitViewDelete: boolean;
  showWorkspaceSessionTabs: boolean;
  agentCompletionNotificationsEnabled: boolean;
  analyticsConsentStatus: AnalyticsConsentStatus;
  openInternalBrowserOnNewPortDetection: boolean;
  browserDataImportPromptSeen: boolean;
  linuxAptSetupPromptDismissed: boolean;
  terminalQuickLaunchDefaults: TerminalQuickLaunchDefaults;
  terminalPresets: TerminalPreset[];
  ai: AiSettings;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  hardwareAccelerationEnabled: true,
  workspaceStateStorageMode: "repo",
  defaultAgentLaunchTarget: "new",
  defaultSplitViewGridColumns: 2,
  defaultSplitViewGridRows: 2,
  rememberLastSplitViewPerWorkspace: true,
  confirmSplitViewDelete: true,
  showWorkspaceSessionTabs: true,
  agentCompletionNotificationsEnabled: true,
  analyticsConsentStatus: "unknown",
  openInternalBrowserOnNewPortDetection: false,
  browserDataImportPromptSeen: false,
  linuxAptSetupPromptDismissed: false,
  terminalQuickLaunchDefaults: {
    name: "Terminal",
    target: "session-default"
  },
  terminalPresets: [],
  ai: {
    preferredProvider: "openai",
    apiKeys: {
      openai: "",
      google: "",
      anthropic: ""
    },
    modelByProvider: {
      openai: "gpt-4o-mini",
      google: "gemini-2.5-flash",
      anthropic: "claude-3-5-haiku-latest"
    }
  }
};

export type BrowserDataImportResult =
  | {
      ok: true;
      importedCookies: number;
      skippedCookies: number;
      domains: string[];
    }
  | {
      ok: false;
      reason: string;
    };

export interface BrowserCookieProfileSummary {
  id: string;
  label: string;
  totalCookies: number;
  encryptedCookies: number;
  plaintextCookies: number;
}

export interface AgentCompletionNotificationPayload {
  agentId: string;
  title: string;
  body: string;
}

export interface InstalledIde {
  id: string;
  name: string;
  executablePath: string;
  iconDataUrl: string | null;
}
