import type { ConnectorAuthPrompt, ConnectorAuthPromptAnswer } from "@shared/types/connectors/authPrompt.types";
import type { McpServerLogo } from "@shared/types/provider/mcp.types";

export type AnswerConnectorAuthPrompt = (answer: ConnectorAuthPromptAnswer) => Promise<void>;

export interface ConnectorAuthPromptsState {
  prompts: readonly ConnectorAuthPrompt[];
  answer: AnswerConnectorAuthPrompt;
}

export interface ConnectorAuthAnswerState {
  sending: ConnectorAuthPromptAnswer["kind"] | null;
  error: string | null;
  send(answer: ConnectorAuthPromptAnswer): Promise<boolean>;
}

export interface ConnectorAuthPromptStackProps {
  conversationId: string;
}

export interface ConnectorAuthCardProps {
  prompt: ConnectorAuthPrompt;
  logo?: McpServerLogo;
  onAnswer: AnswerConnectorAuthPrompt;
}
