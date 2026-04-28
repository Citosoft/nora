import type { AiChatMode, AiChatReasoningLevel } from "@/components/app/types";
import type { AiModelCatalogEntry, AiProvider, AiSettings } from "@shared/appTypes";

export type AiChatProviderModelSelectProps = {
  aiSettings: AiSettings;
  aiModelOptions: Record<AiProvider, AiModelCatalogEntry[]>;
  aiModelLoading: Record<AiProvider, boolean>;
  disabled: boolean;
  onSelect: (provider: AiProvider, model: string) => void;
};

export type AiChatReasoningLevelSelectProps = {
  value: AiChatReasoningLevel;
  supportedLevels: readonly AiChatReasoningLevel[];
  disabled: boolean;
  onChange: (next: AiChatReasoningLevel) => void;
};

export type AiChatModeSelectProps = {
  value: AiChatMode;
  disabled: boolean;
  onChange: (next: AiChatMode) => void;
};
