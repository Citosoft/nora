import type { ConnectorAuthPrompt } from "@shared/types/connectors/authPrompt.types";
import type { McpServerLogo } from "@shared/types/provider/mcp.types";

export type ConnectorAuthPromptOutcome = { kind: "signed-in" } | { kind: "declined" } | { kind: "unanswered" };

export interface ConnectorAuthPromptDraft {
  conversationIds: readonly string[];
  connectorId: string;
  connectorName: string;
  serverName: string;
  logo?: McpServerLogo;
  message?: string;
}

export interface ConnectorAuthPromptBrokerOptions {
  nextId(): string;
  now(): string;
  timeoutMs: number;
  onChanged(prompts: readonly ConnectorAuthPrompt[]): void;
}

export interface ConnectorAuthPromptBroker {
  ask(draft: ConnectorAuthPromptDraft, signal: AbortSignal): Promise<ConnectorAuthPromptOutcome>;
  pending(): readonly ConnectorAuthPrompt[];
  get(id: string): ConnectorAuthPrompt | undefined;
  /** Settles every open prompt for this connector as signed-in (e.g. after OAuth finishes). */
  signedIn(connectorId: string): void;
  settle(id: string, outcome: ConnectorAuthPromptOutcome): void;
}
