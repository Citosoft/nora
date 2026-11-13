import type { AppSettings } from "@shared/appTypes";
import type { NoraSettingsOperations } from "@main/types/nora-tools/noraTools.types";
import type { NoraToolOperationOptions, NoraSettingsOptions } from "@main/types/nora-tools/operations.types";
import { agentSettingsPatchSchema, generalSettingsSchema } from "@shared/nora-tools/settings";
import { threadPreferences } from "@shared/personalization/threads";

function readStoredSettings(settings: AppSettings) {
  const { threads: _threads, idleCompaction: _idle, threadModel: _model, ...personalization } = settings.personalization;
  return { general: generalSettingsSchema.strip().parse(settings), personalization, threads: {
    ...threadPreferences(settings.personalization), idleCompaction: settings.personalization.idleCompaction ?? "suggest",
    threadModel: settings.personalization.threadModel ?? null
  } };
}

export function createSettingsOperations(options: Pick<NoraToolOperationOptions, "boot"> & NoraSettingsOptions): NoraSettingsOperations {
  const read: NoraSettingsOperations["read"] = async () => {
    const window = await options.windowSettings.request({});
    const sync = await options.settingsSync.request({ kind: "read" });
    return { ...readStoredSettings(options.readSettings()), ...window, syncEnabled: sync.enabled };
  };
  return {
    read,
    async update(input) {
      const patch = agentSettingsPatchSchema.parse(input);
      for (const model of [patch.threads?.threadModel, patch.threads?.subagentModel]) {
        if (model && !options.boot().providers.some((provider) => provider.kind === model.kind && provider.instanceId === model.instanceId)) {
          throw new Error(`No installed provider matches ${model.instanceId}. Use list_models to find providers.`);
        }
      }
      if (patch.general || patch.threads || patch.personalization) {
        const saved = await options.updateSettings((current) => {
          const { idleCompaction, threadModel, ...threads } = patch.threads ?? {};
          const personalization = { ...current.personalization, ...patch.personalization,
            threads: { ...current.personalization.threads, ...threads },
            ...(idleCompaction !== undefined ? { idleCompaction } : {}) };
          if (threadModel === null) delete personalization.threadModel;
          else if (threadModel !== undefined) personalization.threadModel = threadModel;
          const general = patch.general;
          return { ...current, ...general, personalization,
            ai: { ...current.ai, ...general?.ai,
              apiKeys: { ...current.ai.apiKeys, ...general?.ai?.apiKeys },
              modelByProvider: { ...current.ai.modelByProvider, ...general?.ai?.modelByProvider } },
            voice: { ...current.voice, ...general?.voice },
            terminalQuickLaunchDefaults: { ...current.terminalQuickLaunchDefaults, ...general?.terminalQuickLaunchDefaults }
          };
        });
        options.onSettingsChanged(saved);
      }
      if (patch.appearance || patch.local) await options.windowSettings.request({ appearance: patch.appearance, local: patch.local });
      if (patch.syncEnabled !== undefined) await options.settingsSync.request({ kind: "set-enabled", enabled: patch.syncEnabled });
      return read();
    }
  };
}
