export type RuntimeRoute =
  | { kind: "attachment-upload" | "settings" | "settings-update" | "bot-settings" | "bot-save" | "info" | "provider-options" | "projects" | "bots" | "conversations" | "create" | "tasks" | "events" | "ticket" | "inbox" | "inbox-command" }
  | { kind: "conversation" | "timeline" | "send" | "decision" | "cancel" | "bot-chat"; id: string };
