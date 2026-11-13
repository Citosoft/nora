import type { AppSettings } from "@shared/appTypes";
import type { SettingsUpdatesDeps } from "@main/types/settingsUpdates.types";

/** Serialize functional updates so cloud preferences cannot overwrite unrelated local settings. */
export function createSettingsUpdates(deps: SettingsUpdatesDeps) {
  let pending = Promise.resolve();
  return {
    update(change: (settings: AppSettings) => AppSettings): Promise<AppSettings> {
      const task = pending.then(() => deps.save(change(deps.read()))).then((settings) => { deps.onSaved(); return settings; });
      pending = task.then(() => undefined, () => undefined);
      return task;
    }
  };
}
