import type { AnalyticsInventorySources } from "@main/types/analytics/analytics.types";
import { toAnalyticsIdentifier } from "./identifier";

/**
 * A snapshot of what this installation has set up, as counts and code-defined option names. It answers adoption
 * questions (how many people use bots, connectors, the notch island) without naming any bot, workspace or connector.
 */
export function buildAnalyticsInventory(sources: AnalyticsInventorySources): Record<string, number | string | boolean> {
  const { boot, settings } = sources;
  const bots = boot.personalization.bots;
  const privateBots = Object.values(bots?.workspaces ?? {}).reduce((total, workspace) => total + workspace.private.length, 0);
  const { connectors, threads } = sources;
  return {
    workspaces: boot.workspaces.length,
    providersInstalled: boot.providers.length,
    providerKinds: [...new Set(boot.providers.map((provider) => provider.kind))].sort().join(","),
    globalBots: bots?.global.length ?? 0,
    privateBots,
    sharedBots: boot.sharedBots.reduce((total, set) => total + set.bots.length, 0),
    connectors: connectors.length,
    connectorsConnected: connectors.filter((connector) => connector.status === "connected").length,
    apps: sources.apps,
    threads: threads.total,
    threadsArchived: threads.archived,
    roleConfigured: boot.personalization.defaultRole !== null,
    keepRunningInBackground: settings.lifecycle.keepRunningInBackground,
    launchAtLogin: settings.lifecycle.launchAtLogin,
    notchIsland: settings.notchIsland.enabled,
    phonePush: settings.phonePushNotificationsEnabled,
    completionNotifications: settings.agentCompletionNotificationsEnabled,
    workspaceStateStorageMode: settings.workspaceStateStorageMode,
    defaultAgentLaunchTarget: settings.defaultAgentLaunchTarget,
    aiPreferredProvider: settings.ai.preferredProvider,
    simpleTaskProvider: settings.ai.simpleTaskProvider,
    dictationProvider: settings.voice.dictationProvider,
    uiFontSize: settings.uiFontSize,
    fileEditorTheme: toAnalyticsIdentifier(settings.fileEditorThemeId) ?? "default",
    terminalPresets: settings.terminalPresets.length
  };
}
