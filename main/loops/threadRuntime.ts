import { askBotThread } from "@main/bots/conversations/runner";
import { isProviderKind } from "@shared/providers/providerKinds";
import { assertLoopReviewer } from "@shared/loopStages";
import type { LoopThreadRuntime } from "@main/types/loopRunner.types";
import type { LoopThreadRuntimeDeps } from "@main/types/loopThreadRuntime.types";
import type { ProviderBinding } from "@shared/types/conversation/contracts.types";

/** Every stage owns a durable thread; bot snapshots, memory and connectors use the regular execution host. */
export function createLoopThreadRuntime(deps: LoopThreadRuntimeDeps): LoopThreadRuntime {
  return {
    async prepare(run, signal) {
      signal.throwIfAborted();
      if (!run.worktreePath) throw new Error("Workflow checkout is missing.");
      const entry = deps.boot().workspaces.find((workspace) => workspace.shellProjectId === run.projectId);
      if (!entry) throw new Error("Register this workspace in Nora before starting its workflow.");
      await deps.registerCheckouts(run.projectId, [...(entry.checkouts ?? []).map((checkout) => checkout.path), run.worktreePath]);
      signal.throwIfAborted();
      const workspace = deps.boot().workspaces.find((candidate) => candidate.id === entry.id);
      const checkout = workspace && [workspace.workspace, ...(workspace.checkouts ?? [])].find((candidate) => candidate.path === run.worktreePath);
      if (!checkout) throw new Error("The workflow checkout is not registered in Nora.");
      const host = deps.host();
      const roles = [];
      for (const role of run.roles) {
        signal.throwIfAborted();
        const conversationId = role.conversationId ?? `workflow:${run.id}:${role.roleId}`;
        const existing = host.header(conversationId)?.conversation;
        if (existing) {
          if (existing.workspace.checkoutId !== checkout.checkoutId || (existing.bot?.botId !== role.botId && !!(existing.bot || role.botId))
            || existing.source?.kind !== "workflow" || existing.source.runId !== run.id || existing.source.stageId !== role.roleId) {
            throw new Error(`${role.name}'s thread no longer belongs to this workflow checkout.`);
          }
          roles.push({ ...role, conversationId });
          continue;
        }
        const snapshot = role.botSnapshot;
        if (role.botId && !snapshot) throw new Error(`${role.name}'s saved bot snapshot is missing. Start a new run.`);
        const kind = snapshot?.binding.kind ?? role.toolId;
        if (!isProviderKind(kind) || kind === "nora") throw new Error(`${role.name} needs an installed execution provider.`);
        if (role.kind === "reviewer") assertLoopReviewer(kind, role.name);
        const provider = deps.boot().providers.find((candidate) => candidate.kind === kind
          && (!(snapshot?.binding.instanceId ?? role.instanceId) || candidate.instanceId === (snapshot?.binding.instanceId ?? role.instanceId)));
        if (!provider) throw new Error(`${role.name}'s provider instance is unavailable.`);
        const access = { ...checkout, access: role.kind === "reviewer" ? "read" as const : "write" as const };
        const catalog = await host.catalog(kind, provider.instanceId, access);
        signal.throwIfAborted();
        if (catalog.status !== "available") throw new Error(catalog.failure.message);
        const model = snapshot?.binding.model ?? role.model ?? catalog.catalog.models[0]?.id;
        const permissionPolicy = snapshot?.binding.permissionPolicy ?? catalog.catalog.policies[0]?.id;
        if (!model || !permissionPolicy) throw new Error(`${role.name}'s runtime has no model or permission policy available.`);
        const binding: ProviderBinding = { kind, instanceId: provider.instanceId, model,
          reasoning: snapshot?.binding.reasoning ?? null, permissionPolicy };
        await host.execute({ kind: "create", commandId: `${conversationId}:create`, conversationId,
          title: `${run.definition.name} · ${role.name}`.slice(0, 100), workspace: access, provider: binding, parentId: null,
          source: { kind: "workflow", projectId: run.projectId, runId: run.id, stageId: role.roleId },
          ...(snapshot ? { botId: snapshot.botId } : {}) }, snapshot);
        signal.throwIfAborted();
        roles.push({ ...role, toolId: kind, instanceId: provider.instanceId, model, conversationId });
      }
      return roles;
    },
    async execute(input) {
      input.signal.throwIfAborted();
      const host = deps.host();
      const seen = new Set<string>();
      const unsubscribe = host.subscribe({ after: host.eventCursor(), conversationId: input.conversationId,
        onError: () => {}, onEvent(event) {
          if (event.payload.kind !== "item") return;
          const item = event.payload.item;
          if (item.kind === "message" && item.role === "assistant" && item.complete && !seen.has(item.id)) {
            seen.add(item.id); input.onOutput(`${item.text}\n\n`);
          }
        } });
      try {
        const reply = await askBotThread({ host, nextId: deps.nextId }, { conversationId: input.conversationId,
          instruction: input.prompt, timeoutMs: input.timeoutMs, signal: input.signal,
          onWaiting: () => input.onOutput("\nThe stage needs input in its thread.\n\n") });
        return { status: reply.status, output: reply.text ?? "", failure: reply.failure };
      } finally { unsubscribe(); }
    }
  };
}
