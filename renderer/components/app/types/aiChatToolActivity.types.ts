export type AiChatToolActivityStatus = "running" | "done" | "error" | "info";

export type AiChatToolActivityEntry = {
  id: string;
  label: string;
  detail: string | null;
  status: AiChatToolActivityStatus;
};
