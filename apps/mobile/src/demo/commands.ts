import type { CommandReceipt } from "@shared/types/conversation/contracts.types";
import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { RuntimeClient } from "@/types/runtimeClient.types";
import type { DemoStore } from "@/types/demo.types";
import { RemoteRequestError } from "@/api/http/remoteRequestError";
import { demoConversation, demoRun, demoView } from "./seed";

export function createDemoCommands(store: DemoStore, bots: () => BotDefinition[]): Pick<RuntimeClient,
  "createConversation" | "createBotChat" | "sendMessage" | "decideAction" | "cancelTask"> {
  const receipts = new Map<string, CommandReceipt>();
  const once = (commandId: string, conversationId: string, action: () => void): CommandReceipt => {
    const previous = receipts.get(commandId);
    if (previous) return previous;
    action();
    const receipt = store.receipt(commandId, conversationId);
    receipts.set(commandId, receipt);
    return receipt;
  };
  const finish = (conversationId: string, runId: string, text: string): void => {
    const run = store.find(conversationId).runHistory.runs.find(r => r.id === runId);
    if (!run || ["completed", "interrupted"].includes(run.state)) return;
    store.emit(conversationId, { kind: "item", item: { id: `${runId}-reply`, runId, createdAt: store.now(), kind: "message", role: "assistant", text, complete: true } });
    store.emit(conversationId, { kind: "run", run: { ...run, state: "completed", updatedAt: store.now() } });
  };
  return {
    createConversation: async request => once(request.commandId, request.conversationId, () => {
      store.threads.set(request.conversationId, demoView({ ...demoConversation(request.conversationId, request.title, store.now(), request.projectId), ...(request.provider ? { provider: request.provider } : {}) }));
      store.emit(request.conversationId, { kind: "conversation", conversation: store.find(request.conversationId).header.conversation });
    }),
    createBotChat: async (botId, request) => once(request.commandId, request.conversationId, () => {
      const bot = bots().find(b => b.id === botId);
      if (!bot) throw new RemoteRequestError("runtime", { kind: "api", status: 404, code: "not-found", message: "This demo bot is no longer available." });
      const workspaceId = request.scope.kind === "workspace" ? request.scope.workspaceId : "demo-studio";
      const conversation = { ...demoConversation(request.conversationId, bot.name, store.now(), workspaceId),
        direct: { botId, name: bot.name, role: bot.role, avatar: bot.avatar, scope: request.scope, workspaceId } };
      store.threads.set(request.conversationId, demoView(conversation));
      store.emit(request.conversationId, { kind: "conversation", conversation });
    }),
    sendMessage: async (conversationId, request) => once(request.commandId, conversationId, () => {
      const conversation = store.find(conversationId).header.conversation;
      store.emit(conversationId, { kind: "conversation", conversation: { ...conversation, ...(request.providerChange ? { provider: request.providerChange.next } : {}), updatedAt: store.now() } });
      store.emit(conversationId, { kind: "run", run: demoRun(request.runId, conversationId, request.instruction, "running", store.now()) });
      store.emit(conversationId, { kind: "item", item: { id: `${request.runId}-user`, runId: request.runId, createdAt: store.now(), kind: "message", role: "user", text: request.instruction, complete: true } });
      store.schedule(() => {
        const run = store.find(conversationId).runHistory.runs.find(r => r.id === request.runId);
        if (run?.state !== "running") return;
        store.emit(conversationId, { kind: "item", item: { id: `${request.runId}-reply`, runId: request.runId, createdAt: store.now(), kind: "message", role: "assistant", text: "Simulating a response…", complete: false } });
      }, 350);
      store.schedule(() => finish(conversationId, request.runId,
        `Demo response to: “${request.instruction.slice(0, 180)}”\n\nYour message was received locally. In a connected account, your agent would carry out this request on your computer. No AI model or computer is running in this demo.\n\nTry the Inbox to approve a sample command or answer a question, or open Settings to edit a demo bot.`), 1100);
    }),
    decideAction: async (requestId, request) => once(request.commandId, request.conversationId, () => {
      const pending = store.find(request.conversationId).header.pendingRequests.find(r => r.id === requestId);
      if (!pending) throw new RemoteRequestError("runtime", { kind: "api", status: 409, code: "conflict", message: "This demo request has already been answered." });
      store.emit(request.conversationId, { kind: "request", request: { ...pending, status: "resolved" } });
      const text = request.response.kind === "approval" ? `Demo decision recorded: ${request.response.optionId}. No command was executed.`
        : `Demo answer recorded: ${Object.values(request.response.answers).flat().join(", ")}.`;
      finish(request.conversationId, pending.runId, text);
    }),
    cancelTask: async (runId, request) => once(request.commandId, request.conversationId, () => {
      const run = store.find(request.conversationId).runHistory.runs.find(r => r.id === runId);
      if (!run) throw new RemoteRequestError("runtime", { kind: "api", status: 404, code: "not-found", message: "Demo task not found." });
      store.emit(request.conversationId, { kind: "run", run: { ...run, state: "interrupted", updatedAt: store.now() } });
      for (const pending of store.find(request.conversationId).header.pendingRequests.filter(r => r.runId === runId)) {
        store.emit(request.conversationId, { kind: "request", request: { ...pending, status: "expired" } });
      }
    })
  };
}
