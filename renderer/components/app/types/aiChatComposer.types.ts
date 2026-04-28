import type { AiChatMode, AiChatReasoningLevel } from "@/components/app/types";
import type { AiModelCatalogEntry, AiProvider, AiSettings } from "@shared/appTypes";
import type { AiChatWorkspacePill } from "@/components/app/types/aiChatPanelLayout.types";
import type { RefObject } from "react";

export type AiChatComposerProps = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  showConfigureAiSettingsShortcut: boolean;
  showModelBar: boolean;
  onOpenAiSettings: () => void;
  aiSettings: AiSettings;
  aiModelOptions: Record<AiProvider, AiModelCatalogEntry[]>;
  aiModelLoading: Record<AiProvider, boolean>;
  onSelectAiChatProviderModel: (provider: AiProvider, model: string) => void;
  workspacePill: AiChatWorkspacePill;
  chatMode: AiChatMode;
  onChatModeChange: (mode: AiChatMode) => void;
  provider: AiProvider | null;
  effectiveReasoningMode: AiChatReasoningLevel;
  supportedReasoningLevels: readonly AiChatReasoningLevel[];
  onReasoningModeChange: (mode: AiChatReasoningLevel) => void;
  hasTransport: boolean;
  busy: boolean;
  canSend: boolean;
};
