import type { LocalVoiceSetupStatus } from "@shared/appTypes";

export interface LocalVoiceSetupControl {
  status: LocalVoiceSetupStatus | null;
  loading: boolean;
  installing: boolean;
  error: string | null;
  refresh(): void;
  install(): void;
}

/** What Settings shows about the selected local model: one status line and the install button's wording. */
export interface LocalVoiceSetupSummary {
  ready: boolean;
  status: string;
  installLabel: string;
}
