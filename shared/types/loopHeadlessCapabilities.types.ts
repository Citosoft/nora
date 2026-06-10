export type LoopHeadlessPromptStyle =
  | "codex-exec"
  | "claude-print"
  | "gemini-prompt"
  | "cursor-print-trust"
  | "print-flag"
  | "message-flag"
  | "execute-flag"
  | "goose-run"
  | "opencode-print"
  | "copilot-print"
  | "cline-yolo"
  | "continue-print"
  | "kilo-run"
  | "crush-run"
  | "rovo-run"
  | "qwen-print";

export type LoopHeadlessToolCapability = {
  toolId: string;
  promptStyle: LoopHeadlessPromptStyle;
};
