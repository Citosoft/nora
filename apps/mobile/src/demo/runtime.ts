import { botDefinitionSchema } from "@shared/bots/contracts";
import { botsResponseSchema, projectsResponseSchema, conversationsResponseSchema, conversationDetailResponseSchema, timelineResponseSchema, tasksResponseSchema, eventsResponseSchema, inboxResponseSchema } from "@shared/remote-access/runtimeApi";
import { RUNTIME_CAPABILITIES } from "@shared/remote-access/runtimeApi";
import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { RemoteSettings } from "@shared/types/remote-access/management.types";
import type { DemoRuntime } from "@/types/demo.types";
import { demoProviderOptions } from "./providerOptions";
import { createDemoStore } from "./store";
import { demoBots, demoProjects } from "./seed";
import { createDemoCommands } from "./commands";
import { createDemoInbox, demoSummaries } from "./inbox";

export function createDemoRuntime(now: () => string = () => new Date().toISOString()): DemoRuntime {
  const { store, subscribe, dispose } = createDemoStore(now);
  const inbox = createDemoInbox(store);
  let bots: BotDefinition[] = botDefinitionSchema.array().parse(demoBots);
  let settings: RemoteSettings = { automaticTitles: true, automaticMemory: true, followUp: "queue", toolOutputBudget: "compact" };
  const client: DemoRuntime["client"] = {
    origin: "https://nora-demo.invalid",
    uploadAttachment: async (request) => ({ id: `demo-file-${Date.now()}`, name: request.name, mimeType: request.mimeType || "application/octet-stream",
      path: `/demo/attachments/${request.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`, size: Math.floor(request.data.length * 3 / 4) - (request.data.endsWith("==") ? 2 : request.data.endsWith("=") ? 1 : 0) }),
    info: async () => ({ apiVersion: 1, runtimeVersion: "demo", name: "Demo Mac", environment: "desktop", environmentId: "demo-desktop", capabilities: [...RUNTIME_CAPABILITIES], cursor: store.events.at(-1)?.cursor ?? 0 }),
    providerOptions: async () => structuredClone(demoProviderOptions),
    projects: async () => projectsResponseSchema.parse({ projects: demoProjects }).projects,
    bots: async () => botsResponseSchema.parse({ bots: bots.map(bot => ({ id: bot.id, name: bot.name, role: bot.role, avatar: bot.avatar,
      scope: bot.scope.kind === "global" ? { kind: "global" } : { kind: "workspace", workspaceId: bot.scope.workspaceId },
      chatConversationId: [...store.threads.values()].find(v => v.header.conversation.direct?.botId === bot.id && !v.header.conversation.direct.retiredAt)?.header.conversation.id ?? null })) }).bots,
    settings: async () => ({ ...settings }),
    updateSettings: async patch => { settings = { ...settings, ...patch }; return { ...settings }; },
    botSettings: async () => botDefinitionSchema.array().parse(bots),
    saveBot: async input => {
      const previous = bots.find(bot => bot.id === input.id);
      const bot: BotDefinition = { ...input, revision: (previous?.revision ?? 0) + 1, binding: previous?.binding ?? demoBots[0]!.binding };
      bots = [...bots.filter(entry => entry.id !== bot.id), bot];
      return botDefinitionSchema.array().parse(bots);
    },
    conversations: async (query = {}) => conversationsResponseSchema.parse({ conversations: demoSummaries(store).filter(summary => (!query.projectId || summary.conversation.workspace.projectId === query.projectId)
      && (query.settled === undefined || Boolean(summary.conversation.archivedAt) === query.settled)) }).conversations,
    conversation: async id => { const view = store.find(id); return conversationDetailResponseSchema.parse({ header: view.header, timeline: { schemaVersion: 1, conversationId: id,
      cursor: view.header.cursor, nextBefore: null, scope: "timeline", items: view.items } }); },
    timeline: async id => { const view = store.find(id); return timelineResponseSchema.parse({ page: { schemaVersion: 1, conversationId: id, cursor: view.header.cursor, nextBefore: null, scope: "timeline", items: view.items } }).page; },
    tasks: async () => tasksResponseSchema.parse({ tasks: demoSummaries(store).flatMap(summary => summary.latestRun ? [{ conversationId: summary.conversation.id,
      conversationTitle: summary.conversation.title, projectId: summary.conversation.workspace.projectId, run: summary.latestRun,
      label: store.find(summary.conversation.id).runHistory.runs.at(-1)?.instruction ?? "", pendingRequestCount: summary.pendingRequestCount }] : []) }).tasks,
    events: async query => {
      const events = store.events.filter(e => e.cursor > query.after && (!query.conversationId || e.conversationId === query.conversationId)).slice(0, query.limit ?? 500);
      return eventsResponseSchema.parse({ schemaVersion: 1, after: query.after, nextCursor: events.at(-1)?.cursor ?? query.after, events });
    },
    realtimeTicket: async () => ({ ticket: "offline-demo-does-not-issue-authentication-tokens", expiresAt: new Date(Date.parse(now()) + 60_000).toISOString() }),
    realtimeUrl: () => "wss://nora-demo.invalid",
    ...createDemoCommands(store, () => bots),
    inbox: async () => inboxResponseSchema.parse(inbox.read()),
    updateInbox: async command => inboxResponseSchema.parse(inbox.update(command))
  };
  return { client, subscribe, dispose };
}
