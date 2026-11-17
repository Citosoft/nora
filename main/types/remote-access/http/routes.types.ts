export type RuntimeRoute =
  | { kind: "info" | "projects" | "conversations" | "create" | "tasks" | "events" | "ticket" }
  | { kind: "conversation" | "timeline" | "send" | "decision" | "cancel"; id: string };
