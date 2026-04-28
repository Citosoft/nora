import type { AiChatMessage, AiChatReasoningLevel } from "@/components/app/types";
import type { AiModelCatalogEntry, AiProvider, AiSettings } from "@shared/appTypes";

export type AiChatPanelProps = {
  tabId?: string;
  projectId?: string | null;
  projectName?: string | null;
  projectRootPath?: string | null;
  workspaceFilesRootPath?: string | null;
  reasoningMode?: AiChatReasoningLevel;
  onReasoningModeChange?: (mode: AiChatReasoningLevel) => void;
  aiSettings?: AiSettings;
  aiModelOptions?: Record<AiProvider, AiModelCatalogEntry[]>;
  aiModelLoading?: Record<AiProvider, boolean>;
  onSelectAiChatProviderModel?: (provider: AiProvider, model: string) => void;
  onOpenAiSettings?: () => void;
  onSetChatTitle?: (title: string) => void;
  messages?: AiChatMessage[];
  onMessagesChange?: (messages: AiChatMessage[]) => void;
};
