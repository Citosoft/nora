import type { AiChatMessage } from "@/components/app/types";
import type { AiProvider } from "@shared/appTypes";
import type { RefObject } from "react";

export type AiChatPanelHeaderProps = {
  provider: AiProvider | null;
  selectedProvider: string;
  selectedModel: string;
  onOpenAiSettings: () => void;
  isStreaming: boolean;
  onStop: () => void;
};

export type AiChatTranscriptProps = {
  transcriptRef: RefObject<HTMLDivElement | null>;
  chatMessages: AiChatMessage[];
  showWaitingIndicator: boolean;
  error: Error | undefined;
};

export type AiChatWorkspacePill = {
  label: string;
  title: string;
};
