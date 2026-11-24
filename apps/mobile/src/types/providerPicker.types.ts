import type { ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { ProviderCatalog } from "@shared/types/provider/catalog.types";

export interface ProviderPickerProps {
  providers: readonly { label: string; catalog: ProviderCatalog }[];
  value: ProviderBinding | null;
  onChange(value: ProviderBinding): void;
  disabled?: boolean;
}

export interface ProviderPickerChoice {
  projectId: string | null;
  binding: ProviderBinding;
}

export type ProviderPickerSheet = "model" | "settings" | "permissions" | "reasoning" | null;
