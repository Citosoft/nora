export interface ClaudeAssistantUsageSource {
  type?: unknown;
  sessionId?: unknown;
  timestamp?: unknown;
  cwd?: unknown;
  gitBranch?: unknown;
  message?: {
    model?: unknown;
    usage?: {
      input_tokens?: unknown;
      output_tokens?: unknown;
      cache_read_input_tokens?: unknown;
      cache_creation_input_tokens?: unknown;
    };
  };
}
