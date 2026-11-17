import type { AppSettings } from "@shared/appTypes";

export interface SettingsUpdatesDeps {
  read(): AppSettings;
  save(settings: AppSettings): Promise<AppSettings>;
  onSaved(): void;
}
