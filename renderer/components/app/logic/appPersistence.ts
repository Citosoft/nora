import type {
  AccentColor,
  AiChatMessage,
  AiChatReasoningLevel,
  AiChatTabState,
  BrowserTabState,
  ForgeViewerTabState,
  StoredAiChatTabsState,
  StoredBrowserTabsState,
  StoredFileEditorTabState,
  StoredForgeViewerTabsState,
  StoredUiLayout,
  StoredVercelWorkspaceLink,
  StoredVercelWorkspaceLinks,
  StoredWorkspaceContentState,
  StoredWorkspaceSplitViewSelections,
  TerminalFontId,
  TerminalThemeId,
  ThemeMode
} from "@/components/app/types";
import { isAiChatReasoningLevel } from "@/components/app/types";
import { clampRounded } from "@shared/math";

const THEME_STORAGE_KEY = "nora-theme-mode";
const ACCENT_STORAGE_KEY = "nora-accent-color";
const TERMINAL_THEME_STORAGE_KEY = "nora-terminal-theme";
const TERMINAL_FONT_STORAGE_KEY = "nora-terminal-font";
const DEFAULT_IDE_STORAGE_KEY = "nora-default-ide";
const USER_DISPLAY_NAME_STORAGE_KEY = "nora-user-display-name";
const UI_LAYOUT_STORAGE_KEY = "nora-ui-layout";
const GITHUB_TOKEN_STORAGE_KEY = "nora-github-token";
const GITLAB_TOKEN_STORAGE_KEY = "nora-gitlab-token";
const GITLAB_HOST_STORAGE_KEY = "nora-gitlab-host";
const VERCEL_TOKEN_STORAGE_KEY = "nora-vercel-token";
const GITHUB_ACCOUNT_LABEL_STORAGE_KEY = "nora-github-account-label";
const GITLAB_ACCOUNT_LABEL_STORAGE_KEY = "nora-gitlab-account-label";
const VERCEL_ACCOUNT_LABEL_STORAGE_KEY = "nora-vercel-account-label";
const VERCEL_WORKSPACE_LINKS_STORAGE_KEY = "nora-vercel-workspace-links";
const WORKSPACE_SPLIT_VIEW_SELECTIONS_STORAGE_KEY = "nora-workspace-split-view-selections";
const BROWSER_TABS_STORAGE_KEY = "nora-browser-tabs";
const AI_CHAT_TABS_STORAGE_KEY = "nora-ai-chat-tabs";
const FORGE_VIEWER_TABS_STORAGE_KEY = "nora-forge-viewer-tabs";
const WORKSPACE_CONTENT_STORAGE_KEY = "nora-workspace-content";
const ONBOARDING_COMPLETED_STORAGE_KEY = "nora-onboarding-completed";
const FORCE_MAC_TITLE_BAR_PREVIEW_STORAGE_KEY = "nora-force-mac-title-bar-preview";
const STARTUP_DEPENDENCIES_DISMISSED_STORAGE_KEY = "nora-startup-dependencies-dismissed";

const DEFAULT_UI_LAYOUT: StoredUiLayout = {
  isWorkspaceSidebarCollapsed: false,
  isChangesSidebarCollapsed: true,
  sidebarsSwapped: false,
  workspaceSidebarWidth: 320,
  changesSidebarWidth: 440,
  activeChangesPanelTab: "git",
  collapsedWorkspaceIds: {},
  isTasksSectionCollapsed: true,
  isRemoteMountsSectionCollapsed: true,
  isPortsSectionCollapsed: true,
  isChatbotsSectionCollapsed: true,
  isCliSectionCollapsed: true,
  isSkillsSectionCollapsed: true,
  isSpecsSectionCollapsed: true,
  isLocalTerminalDockCollapsed: false,
  localTerminalDockHeight: 280
};

export function hasStoredUiLayout(): boolean {
  return window.localStorage.getItem(UI_LAYOUT_STORAGE_KEY) !== null;
}

function clampLocalTerminalDockHeight(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_UI_LAYOUT.localTerminalDockHeight;
  }

  return clampRounded(value, 180, 520);
}

function clampWorkspaceSidebarWidth(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_UI_LAYOUT.workspaceSidebarWidth;
  }

  return clampRounded(value, 240, 640);
}

function clampChangesSidebarWidth(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_UI_LAYOUT.changesSidebarWidth;
  }

  return clampRounded(value, 280, 760);
}

function normalizeStoredBrowserTab(value: unknown): BrowserTabState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<BrowserTabState>;
  if (
    typeof candidate.id !== "string" ||
    candidate.id.trim().length === 0 ||
    typeof candidate.projectId !== "string" ||
    candidate.projectId.trim().length === 0 ||
    typeof candidate.title !== "string" ||
    !Array.isArray(candidate.history) ||
    typeof candidate.historyIndex !== "number" ||
    !Number.isInteger(candidate.historyIndex) ||
    (candidate.status !== "starting" && candidate.status !== "running" && candidate.status !== "error")
  ) {
    return null;
  }

  const history = candidate.history.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
  if (!history.length) {
    return null;
  }

  const historyIndex = Math.max(0, Math.min(candidate.historyIndex, history.length - 1));
  return {
    id: candidate.id,
    projectId: candidate.projectId,
    title: candidate.title.trim() || "New browser tab",
    faviconUrl: typeof candidate.faviconUrl === "string" && candidate.faviconUrl.trim().length > 0 ? candidate.faviconUrl : null,
    history,
    historyIndex,
    status: candidate.status
  };
}

function normalizeStoredFileEditorTab(value: unknown): StoredFileEditorTabState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<StoredFileEditorTabState>;
  if (
    typeof candidate.projectId !== "string" ||
    candidate.projectId.trim().length === 0 ||
    typeof candidate.path !== "string" ||
    candidate.path.trim().length === 0
  ) {
    return null;
  }

  return {
    projectId: candidate.projectId.trim(),
    path: candidate.path.trim(),
    rootPath: typeof candidate.rootPath === "string" && candidate.rootPath.trim().length > 0 ? candidate.rootPath.trim() : null
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeAiChatMessage(value: unknown): AiChatMessage | null {
  if (!isPlainRecord(value)) {
    return null;
  }
  if (typeof value.id !== "string" || !value.id.trim()) {
    return null;
  }
  if (typeof value.role !== "string" || !value.role.trim()) {
    return null;
  }
  if (!Array.isArray(value.parts)) {
    return null;
  }
  return value as unknown as AiChatMessage;
}

function parseStoredReasoningLevel(raw: unknown): AiChatReasoningLevel {
  if (typeof raw !== "string") {
    return "off";
  }
  if (raw === "standard") {
    return "off";
  }
  if (raw === "thinking") {
    return "medium";
  }
  if (isAiChatReasoningLevel(raw)) {
    return raw;
  }
  return "off";
}

function normalizeStoredAiChatTab(value: unknown): AiChatTabState | null {
  if (!isPlainRecord(value)) {
    return null;
  }
  if (typeof value.id !== "string" || !value.id.trim() || typeof value.projectId !== "string" || !value.projectId.trim()) {
    return null;
  }
  const title = typeof value.title === "string" && value.title.trim() ? value.title.trim() : "AI Chat";
  const messages = Array.isArray(value.messages)
    ? value.messages.map((entry) => normalizeAiChatMessage(entry)).filter((m): m is AiChatMessage => m !== null)
    : [];
  const reasoningMode = parseStoredReasoningLevel(value.reasoningMode);
  return {
    id: value.id.trim(),
    projectId: value.projectId.trim(),
    title,
    messages,
    reasoningMode
  };
}

function normalizeStoredForgeViewerTab(value: unknown): ForgeViewerTabState | null {
  if (!isPlainRecord(value)) {
    return null;
  }
  if (typeof value.id !== "string" || !value.id.trim() || typeof value.projectId !== "string" || !value.projectId.trim()) {
    return null;
  }
  const kind = value.kind === "pull_request" || value.kind === "issue" || value.kind === "workflow_run" ? value.kind : null;
  if (!kind) {
    return null;
  }
  const numberRaw = value.number;
  if (typeof numberRaw !== "number" || !Number.isInteger(numberRaw) || numberRaw < 1) {
    return null;
  }
  const title =
    typeof value.title === "string" && value.title.trim()
      ? value.title.trim()
      : kind === "workflow_run"
        ? `Action #${numberRaw}`
        : `${kind === "pull_request" ? "PR" : "Issue"} #${numberRaw}`;
  const forgeRepoHostOverride =
    typeof value.forgeRepoHostOverride === "string" && value.forgeRepoHostOverride.trim().length > 0
      ? value.forgeRepoHostOverride.trim()
      : null;
  const forgeRepoFullNameOverride =
    typeof value.forgeRepoFullNameOverride === "string" && value.forgeRepoFullNameOverride.trim().length > 0
      ? value.forgeRepoFullNameOverride.trim()
      : null;
  return {
    id: value.id.trim(),
    projectId: value.projectId.trim(),
    kind,
    number: numberRaw,
    title,
    forgeRepoHostOverride,
    forgeRepoFullNameOverride
  };
}

export function readStoredThemeMode(): ThemeMode {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

export function readStoredAccentColor(): AccentColor {
  const stored = window.localStorage.getItem(ACCENT_STORAGE_KEY);
  return stored === "silver" || stored === "green" || stored === "blue" || stored === "amber" || stored === "rose" || stored === "violet"
    ? stored
    : "silver";
}

export function readStoredUiLayout(): StoredUiLayout {
  try {
    const raw = window.localStorage.getItem(UI_LAYOUT_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_UI_LAYOUT;
    }

    const parsed = JSON.parse(raw) as Partial<StoredUiLayout>;
    return {
      isWorkspaceSidebarCollapsed: parsed.isWorkspaceSidebarCollapsed === true,
      isChangesSidebarCollapsed: parsed.isChangesSidebarCollapsed !== false,
      sidebarsSwapped: parsed.sidebarsSwapped === true,
      workspaceSidebarWidth: clampWorkspaceSidebarWidth(parsed.workspaceSidebarWidth),
      changesSidebarWidth: clampChangesSidebarWidth(parsed.changesSidebarWidth),
      activeChangesPanelTab:
        parsed.activeChangesPanelTab === "files" ||
        parsed.activeChangesPanelTab === "context" ||
        parsed.activeChangesPanelTab === "forge" ||
        parsed.activeChangesPanelTab === "vercel"
          ? parsed.activeChangesPanelTab
          : "git",
      collapsedWorkspaceIds:
        parsed.collapsedWorkspaceIds && typeof parsed.collapsedWorkspaceIds === "object"
          ? parsed.collapsedWorkspaceIds
          : {},
      isTasksSectionCollapsed: parsed.isTasksSectionCollapsed === true,
      isRemoteMountsSectionCollapsed: parsed.isRemoteMountsSectionCollapsed === true,
      isPortsSectionCollapsed: parsed.isPortsSectionCollapsed === true,
      isChatbotsSectionCollapsed: parsed.isChatbotsSectionCollapsed === true,
      isCliSectionCollapsed: parsed.isCliSectionCollapsed === true,
      isSkillsSectionCollapsed: parsed.isSkillsSectionCollapsed === true,
      isSpecsSectionCollapsed: parsed.isSpecsSectionCollapsed === true,
      isLocalTerminalDockCollapsed: parsed.isLocalTerminalDockCollapsed === true,
      localTerminalDockHeight: clampLocalTerminalDockHeight(parsed.localTerminalDockHeight)
    };
  } catch {
    return DEFAULT_UI_LAYOUT;
  }
}

export function readStoredTerminalThemeId(): TerminalThemeId {
  const stored = window.localStorage.getItem(TERMINAL_THEME_STORAGE_KEY);
  return stored === "app" ||
    stored === "vscode-dark" ||
    stored === "dracula" ||
    stored === "solarized-dark" ||
    stored === "solarized-light"
    ? stored
    : "app";
}

export function readStoredTerminalFontId(): TerminalFontId {
  const stored = window.localStorage.getItem(TERMINAL_FONT_STORAGE_KEY);
  return stored === "ibm-plex-mono" ||
    stored === "jetbrains-mono" ||
    stored === "fira-code" ||
    stored === "cascadia-mono" ||
    stored === "source-code-pro" ||
    stored === "space-mono"
    ? stored
    : "ibm-plex-mono";
}

export function readStoredDefaultIdeId(): string | null {
  const stored = window.localStorage.getItem(DEFAULT_IDE_STORAGE_KEY);
  return stored && stored.trim().length > 0 ? stored : null;
}

export function readStoredUserDisplayName(): string {
  return window.localStorage.getItem(USER_DISPLAY_NAME_STORAGE_KEY) || "";
}

export function readStoredGithubToken(): string {
  return window.localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY) || "";
}

export function readStoredGitlabToken(): string {
  return window.localStorage.getItem(GITLAB_TOKEN_STORAGE_KEY) || "";
}

export function readStoredGitlabHost(): string {
  return window.localStorage.getItem(GITLAB_HOST_STORAGE_KEY) || "";
}

export function readStoredVercelToken(): string {
  return window.localStorage.getItem(VERCEL_TOKEN_STORAGE_KEY) || "";
}

export function readStoredGithubAccountLabel(): string | null {
  const stored = window.localStorage.getItem(GITHUB_ACCOUNT_LABEL_STORAGE_KEY);
  return stored && stored.trim().length > 0 ? stored : null;
}

export function readStoredGitlabAccountLabel(): string | null {
  const stored = window.localStorage.getItem(GITLAB_ACCOUNT_LABEL_STORAGE_KEY);
  return stored && stored.trim().length > 0 ? stored : null;
}

export function readStoredVercelAccountLabel(): string | null {
  const stored = window.localStorage.getItem(VERCEL_ACCOUNT_LABEL_STORAGE_KEY);
  return stored && stored.trim().length > 0 ? stored : null;
}

export function readStoredVercelWorkspaceLinks(): StoredVercelWorkspaceLinks {
  try {
    const raw = window.localStorage.getItem(VERCEL_WORKSPACE_LINKS_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, Partial<StoredVercelWorkspaceLink>>;
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => typeof value?.vercelProjectId === "string" && value.vercelProjectId.trim().length > 0)
        .map(([projectId, value]) => [
          projectId,
          {
            vercelProjectId: value.vercelProjectId!.trim(),
            teamId: typeof value.teamId === "string" && value.teamId.trim().length > 0 ? value.teamId : null
          } satisfies StoredVercelWorkspaceLink
        ])
    );
  } catch {
    return {};
  }
}

export function readStoredWorkspaceSplitViewSelections(): StoredWorkspaceSplitViewSelections {
  try {
    const raw = window.localStorage.getItem(WORKSPACE_SPLIT_VIEW_SELECTIONS_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string" && entry[1].trim().length > 0
      )
    );
  } catch {
    return {};
  }
}

export function readStoredBrowserTabsState(): StoredBrowserTabsState {
  try {
    const raw = window.localStorage.getItem(BROWSER_TABS_STORAGE_KEY);
    if (!raw) {
      return { tabs: [], focusedTabId: null };
    }

    const parsed = JSON.parse(raw) as {
      tabs?: unknown[];
      focusedTabId?: unknown;
    };
    const tabs = Array.isArray(parsed.tabs)
      ? parsed.tabs.map((entry) => normalizeStoredBrowserTab(entry)).filter((entry): entry is BrowserTabState => entry !== null)
      : [];
    const focusedTabId =
      typeof parsed.focusedTabId === "string" && tabs.some((tab) => tab.id === parsed.focusedTabId)
        ? parsed.focusedTabId
        : null;
    return { tabs, focusedTabId };
  } catch {
    return { tabs: [], focusedTabId: null };
  }
}

export function readStoredAiChatTabsState(): StoredAiChatTabsState {
  try {
    const raw = window.localStorage.getItem(AI_CHAT_TABS_STORAGE_KEY);
    if (!raw) {
      return { tabs: [], focusedTabId: null };
    }

    const parsed = JSON.parse(raw) as {
      tabs?: unknown[];
      focusedTabId?: unknown;
    };
    const tabs = Array.isArray(parsed.tabs)
      ? parsed.tabs.map((entry) => normalizeStoredAiChatTab(entry)).filter((tab): tab is AiChatTabState => tab !== null)
      : [];
    const focusedTabId =
      typeof parsed.focusedTabId === "string" && tabs.some((tab) => tab.id === parsed.focusedTabId)
        ? parsed.focusedTabId
        : null;
    return { tabs, focusedTabId };
  } catch {
    return { tabs: [], focusedTabId: null };
  }
}

export function readStoredForgeViewerTabsState(): StoredForgeViewerTabsState {
  try {
    const raw = window.localStorage.getItem(FORGE_VIEWER_TABS_STORAGE_KEY);
    if (!raw) {
      return { tabs: [], focusedTabId: null };
    }

    const parsed = JSON.parse(raw) as {
      tabs?: unknown[];
      focusedTabId?: unknown;
    };
    const tabs = Array.isArray(parsed.tabs)
      ? parsed.tabs.map((entry) => normalizeStoredForgeViewerTab(entry)).filter((tab): tab is ForgeViewerTabState => tab !== null)
      : [];
    const focusedTabId =
      typeof parsed.focusedTabId === "string" && tabs.some((tab) => tab.id === parsed.focusedTabId)
        ? parsed.focusedTabId
        : null;
    return { tabs, focusedTabId };
  } catch {
    return { tabs: [], focusedTabId: null };
  }
}

export function readStoredWorkspaceContentState(): StoredWorkspaceContentState {
  try {
    const raw = window.localStorage.getItem(WORKSPACE_CONTENT_STORAGE_KEY);
    if (!raw) {
      return {
        activeWorkspaceContentTab: null,
        fileEditor: null
      };
    }

    const parsed = JSON.parse(raw) as {
      activeWorkspaceContentTab?: unknown;
      fileEditor?: {
        tabs?: unknown[];
        activePath?: unknown;
      } | null;
    };

    const activeWorkspaceContentTab =
      parsed.activeWorkspaceContentTab === "file" || parsed.activeWorkspaceContentTab === "diff"
        ? parsed.activeWorkspaceContentTab
        : null;

    const tabs = Array.isArray(parsed.fileEditor?.tabs)
      ? parsed.fileEditor?.tabs
        .map((entry) => normalizeStoredFileEditorTab(entry))
        .filter((entry): entry is StoredFileEditorTabState => entry !== null)
      : [];
    const uniqueTabs = Array.from(
      new Map(tabs.map((tab) => [tab.path, tab])).values()
    );

    const activePath =
      typeof parsed.fileEditor?.activePath === "string" &&
      uniqueTabs.some((tab) => tab.path === parsed.fileEditor?.activePath)
        ? parsed.fileEditor.activePath
        : null;

    return {
      activeWorkspaceContentTab,
      fileEditor: uniqueTabs.length
        ? {
            tabs: uniqueTabs,
            activePath
          }
        : null
    };
  } catch {
    return {
      activeWorkspaceContentTab: null,
      fileEditor: null
    };
  }
}

export function readStoredOnboardingCompleted(): boolean {
  return window.localStorage.getItem(ONBOARDING_COMPLETED_STORAGE_KEY) === "true";
}

export function readStoredForceMacTitleBarPreview(): boolean {
  return window.localStorage.getItem(FORCE_MAC_TITLE_BAR_PREVIEW_STORAGE_KEY) === "true";
}

export function readStoredStartupDependenciesDismissed(): boolean {
  return window.localStorage.getItem(STARTUP_DEPENDENCIES_DISMISSED_STORAGE_KEY) === "true";
}

export function writeStoredUiLayout(layout: StoredUiLayout): void {
  window.localStorage.setItem(UI_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
}

export function writeStoredThemeMode(mode: ThemeMode): void {
  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
}

export function writeStoredAccentColor(color: AccentColor): void {
  window.localStorage.setItem(ACCENT_STORAGE_KEY, color);
}

export function writeStoredTerminalThemeId(themeId: TerminalThemeId): void {
  window.localStorage.setItem(TERMINAL_THEME_STORAGE_KEY, themeId);
}

export function writeStoredTerminalFontId(fontId: TerminalFontId): void {
  window.localStorage.setItem(TERMINAL_FONT_STORAGE_KEY, fontId);
}

export function writeStoredDefaultIdeId(ideId: string | null): void {
  if (ideId) {
    window.localStorage.setItem(DEFAULT_IDE_STORAGE_KEY, ideId);
    return;
  }
  window.localStorage.removeItem(DEFAULT_IDE_STORAGE_KEY);
}

export function writeStoredUserDisplayName(displayName: string): void {
  const normalized = displayName.trim();
  if (normalized) {
    window.localStorage.setItem(USER_DISPLAY_NAME_STORAGE_KEY, normalized);
    return;
  }

  window.localStorage.removeItem(USER_DISPLAY_NAME_STORAGE_KEY);
}

export function writeStoredGithubToken(token: string): void {
  window.localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, token);
}

export function writeStoredGitlabToken(token: string): void {
  window.localStorage.setItem(GITLAB_TOKEN_STORAGE_KEY, token);
}

export function writeStoredGitlabHost(host: string): void {
  const normalized = host.trim();
  if (normalized) {
    window.localStorage.setItem(GITLAB_HOST_STORAGE_KEY, normalized);
    return;
  }
  window.localStorage.removeItem(GITLAB_HOST_STORAGE_KEY);
}

export function writeStoredVercelToken(token: string): void {
  window.localStorage.setItem(VERCEL_TOKEN_STORAGE_KEY, token);
}

export function writeStoredAccountLabel(
  provider: "github" | "gitlab" | "vercel",
  label: string | null
): void {
  const key =
    provider === "github"
      ? GITHUB_ACCOUNT_LABEL_STORAGE_KEY
      : provider === "gitlab"
        ? GITLAB_ACCOUNT_LABEL_STORAGE_KEY
        : VERCEL_ACCOUNT_LABEL_STORAGE_KEY;
  if (label) {
    window.localStorage.setItem(key, label);
    return;
  }
  window.localStorage.removeItem(key);
}

export function writeStoredVercelWorkspaceLinks(links: StoredVercelWorkspaceLinks): void {
  window.localStorage.setItem(VERCEL_WORKSPACE_LINKS_STORAGE_KEY, JSON.stringify(links));
}

export function writeStoredWorkspaceSplitViewSelection(projectId: string, viewId: string | null): void {
  const current = readStoredWorkspaceSplitViewSelections();
  if (viewId && viewId.trim().length > 0) {
    current[projectId] = viewId;
  } else {
    delete current[projectId];
  }
  window.localStorage.setItem(WORKSPACE_SPLIT_VIEW_SELECTIONS_STORAGE_KEY, JSON.stringify(current));
}

export function writeStoredBrowserTabsState(state: StoredBrowserTabsState): void {
  window.localStorage.setItem(BROWSER_TABS_STORAGE_KEY, JSON.stringify(state));
}

export function writeStoredAiChatTabsState(state: StoredAiChatTabsState): void {
  window.localStorage.setItem(AI_CHAT_TABS_STORAGE_KEY, JSON.stringify(state));
}

export function writeStoredForgeViewerTabsState(state: StoredForgeViewerTabsState): void {
  window.localStorage.setItem(FORGE_VIEWER_TABS_STORAGE_KEY, JSON.stringify(state));
}

export function writeStoredWorkspaceContentState(state: StoredWorkspaceContentState): void {
  window.localStorage.setItem(WORKSPACE_CONTENT_STORAGE_KEY, JSON.stringify(state));
}

export function writeStoredOnboardingCompleted(completed: boolean): void {
  if (completed) {
    window.localStorage.setItem(ONBOARDING_COMPLETED_STORAGE_KEY, "true");
    return;
  }

  window.localStorage.removeItem(ONBOARDING_COMPLETED_STORAGE_KEY);
}

export function writeStoredForceMacTitleBarPreview(enabled: boolean): void {
  if (enabled) {
    window.localStorage.setItem(FORCE_MAC_TITLE_BAR_PREVIEW_STORAGE_KEY, "true");
    return;
  }

  window.localStorage.removeItem(FORCE_MAC_TITLE_BAR_PREVIEW_STORAGE_KEY);
}

export function writeStoredStartupDependenciesDismissed(dismissed: boolean): void {
  if (dismissed) {
    window.localStorage.setItem(STARTUP_DEPENDENCIES_DISMISSED_STORAGE_KEY, "true");
    return;
  }

  window.localStorage.removeItem(STARTUP_DEPENDENCIES_DISMISSED_STORAGE_KEY);
}
