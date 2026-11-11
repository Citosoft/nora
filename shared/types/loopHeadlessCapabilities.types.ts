export type LoopHeadlessPromptStyle =
  | "codex-exec"
  | "claude-print"
  | "cursor-print-trust"
  | "print-flag"
  | "execute-flag"
  | "goose-run"
  | "opencode-print"
  | "copilot-print"
  | "cline-yolo"
  | "kilo-run"
  | "qwen-print";

export type LoopHeadlessToolCapability = {
  toolId: string;
  promptStyle: LoopHeadlessPromptStyle;
};
