/** Href builders so screens never assemble route strings by hand. */
export const routes = Object.freeze({
  home: "/" as const,
  signIn: "/sign-in" as const,
  settings: "/settings" as const,
  runtime: (runtimeId: string) => `/runtimes/${encodeURIComponent(runtimeId)}`,
  newConversation: (runtimeId: string, projectId?: string | null) =>
    `/runtimes/${encodeURIComponent(runtimeId)}/new${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`,
  approvals: (runtimeId: string) => `/runtimes/${encodeURIComponent(runtimeId)}/approvals`,
  activity: (runtimeId: string) => `/runtimes/${encodeURIComponent(runtimeId)}/activity`,
  conversation: (runtimeId: string, conversationId: string) =>
    `/runtimes/${encodeURIComponent(runtimeId)}/conversations/${encodeURIComponent(conversationId)}`
});
