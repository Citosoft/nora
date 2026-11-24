import type { RemoteBot } from "@shared/types/remote-access/runtimeApi.types";

/** Href builders so screens never assemble route strings by hand. */
export const routes = Object.freeze({
  home: "/" as const,
  signIn: "/sign-in" as const,
  computers: "/computers" as const,
  settings: "/settings" as const,
  about: "/about" as const,
  manageBots: (runtimeId: string) => `/runtimes/${encodeURIComponent(runtimeId)}/bots`,
  createBot: (runtimeId: string, workspaceId: string | null = null) =>
    `/runtimes/${encodeURIComponent(runtimeId)}/bots?create=1${workspaceId ? `&workspaceId=${encodeURIComponent(workspaceId)}` : ""}`,
  editBot: (runtimeId: string, botId: string, scope: RemoteBot["scope"]) =>
    `/runtimes/${encodeURIComponent(runtimeId)}/bots?botId=${encodeURIComponent(botId)}${scope.kind === "workspace" ? `&workspaceId=${encodeURIComponent(scope.workspaceId)}` : ""}`,
  runtimeSettings: (runtimeId: string) => `/runtimes/${encodeURIComponent(runtimeId)}/settings`,
  runtime: (runtimeId: string) => `/runtimes/${encodeURIComponent(runtimeId)}`,
  newConversation: (runtimeId: string, projectId?: string | null) =>
    `/runtimes/${encodeURIComponent(runtimeId)}/new${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`,
  /** A bot's chat: its saved conversation when it has one, otherwise the screen that starts it. */
  botChat: (runtimeId: string, botId: string, scope: RemoteBot["scope"]) =>
    `/runtimes/${encodeURIComponent(runtimeId)}/bots/${encodeURIComponent(botId)}${scope.kind === "workspace" ? `?workspaceId=${encodeURIComponent(scope.workspaceId)}` : ""}`,
  inbox: (runtimeId: string) => `/runtimes/${encodeURIComponent(runtimeId)}/inbox`,
  activity: (runtimeId: string) => `/runtimes/${encodeURIComponent(runtimeId)}/activity`,
  conversation: (runtimeId: string, conversationId: string) =>
    `/runtimes/${encodeURIComponent(runtimeId)}/conversations/${encodeURIComponent(conversationId)}`
});
