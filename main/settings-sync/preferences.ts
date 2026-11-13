import type { AppSettings } from "@shared/appTypes";
import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import type { PortableAppearance, PortableSettings } from "@shared/types/settings-sync/sync.types";
import { threadPreferences } from "@shared/personalization/threads";
import { applicableSettings } from "@shared/settings-sync/entries";
import type { ThreadModelDefault } from "@shared/types/personalization/threadModel.types";

const portableModel = (value: ThreadModelDefault | undefined | null) => value ? { kind: value.kind, model: value.model } : null;
export function captureSettings(settings: AppSettings, appearance: PortableAppearance): PortableSettings {
  const threads = threadPreferences(settings.personalization);
  return { ...appearance,
    defaultSplitViewGridColumns: settings.defaultSplitViewGridColumns, defaultSplitViewGridRows: settings.defaultSplitViewGridRows,
    rememberLastSplitViewPerWorkspace: settings.rememberLastSplitViewPerWorkspace, confirmSplitViewDelete: settings.confirmSplitViewDelete,
    showWorkspaceSessionTabs: settings.showWorkspaceSessionTabs, agentCompletionNotificationsEnabled: settings.agentCompletionNotificationsEnabled,
    openInternalBrowserOnNewPortDetection: settings.openInternalBrowserOnNewPortDetection, fileEditorThemeId: settings.fileEditorThemeId,
    defaultRole: settings.personalization.defaultRole, idleCompaction: settings.personalization.idleCompaction ?? "suggest",
    ...threads, threadModel: portableModel(settings.personalization.threadModel), subagentModel: portableModel(threads.subagentModel)
  };
}

/** Model IDs travel between devices; provider instance IDs are resolved on the receiving host. */
function localModel(value: PortableSettings["threadModel"], providers: readonly NativeProvider[]): ThreadModelDefault | null | undefined {
  if (!value) return null;
  const provider = providers.find((entry) => entry.kind === value.kind);
  return provider ? { ...value, instanceId: provider.instanceId } : undefined;
}

export function applySettings(settings: AppSettings, appearance: PortableAppearance, incoming: Partial<PortableSettings>, expected: PortableSettings, providers: readonly NativeProvider[]): AppSettings {
  const values = applicableSettings(captureSettings(settings, appearance), incoming, expected);
  const personalization = { ...settings.personalization };
  if (values.defaultRole !== undefined) personalization.defaultRole = values.defaultRole;
  if (values.idleCompaction !== undefined) personalization.idleCompaction = values.idleCompaction;
  if (values.threadModel !== undefined) {
    const resolved = localModel(values.threadModel, providers);
    if (resolved === null) delete personalization.threadModel;
    else if (resolved) personalization.threadModel = resolved;
  }
  const threads = { ...personalization.threads };
  if (values.subagentModel !== undefined) {
    const resolved = localModel(values.subagentModel, providers);
    if (resolved !== undefined) threads.subagentModel = resolved;
  }
  if (values.toolOutputBudget !== undefined) threads.toolOutputBudget = values.toolOutputBudget;
  if (values.followUp !== undefined) threads.followUp = values.followUp;
  if (values.automaticTitles !== undefined) threads.automaticTitles = values.automaticTitles;
  if (values.settleAfterDays !== undefined) threads.settleAfterDays = values.settleAfterDays;
  if (values.claudeAutoCompactTokens !== undefined) threads.claudeAutoCompactTokens = values.claudeAutoCompactTokens;
  personalization.threads = threads;
  return { ...settings, personalization,
    defaultSplitViewGridColumns: values.defaultSplitViewGridColumns ?? settings.defaultSplitViewGridColumns,
    defaultSplitViewGridRows: values.defaultSplitViewGridRows ?? settings.defaultSplitViewGridRows,
    rememberLastSplitViewPerWorkspace: values.rememberLastSplitViewPerWorkspace ?? settings.rememberLastSplitViewPerWorkspace,
    confirmSplitViewDelete: values.confirmSplitViewDelete ?? settings.confirmSplitViewDelete,
    showWorkspaceSessionTabs: values.showWorkspaceSessionTabs ?? settings.showWorkspaceSessionTabs,
    agentCompletionNotificationsEnabled: values.agentCompletionNotificationsEnabled ?? settings.agentCompletionNotificationsEnabled,
    openInternalBrowserOnNewPortDetection: values.openInternalBrowserOnNewPortDetection ?? settings.openInternalBrowserOnNewPortDetection,
    fileEditorThemeId: values.fileEditorThemeId ?? settings.fileEditorThemeId
  };
}
