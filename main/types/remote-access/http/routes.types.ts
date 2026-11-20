export type RuntimeRoute =
  | { kind: "info" | "projects" | "bots" | "conversations" | "create" | "tasks" | "events" | "ticket" | "inbox" | "inbox-command" }
  | { kind: "conversation" | "timeline" | "send" | "decision" | "cancel" | "bot-chat"; id: string };
