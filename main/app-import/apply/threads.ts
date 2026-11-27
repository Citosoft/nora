import { effectiveRole } from "@shared/personalization/profiles";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { AppImportItemOutcome } from "@shared/types/app-import/appImportApply.types";
import type { AppImportKey, AppImportThread } from "@shared/types/app-import/appImportPlan.types";
import type { ConversationCommand, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { AppImportApplyDeps, AppImportItemApplier, AppImportProject } from "@main/types/app-import/appImportApply.types";
import { resolveImportBinding } from "./binding";
import { appImportIdentity } from "./identity";
import { APPLIED, failed } from "./outcomes";
import { transcriptHistory } from "./transcriptHistory";

const MAX_TITLE_LENGTH = 200;

function threadTitle(thread: AppImportThread): string {
  return (thread.title.trim() || "Imported thread").slice(0, MAX_TITLE_LENGTH);
}

/** The thread's worktree when Nora tracks it as a checkout of the workspace, otherwise the workspace itself. */
async function checkoutFor(thread: AppImportThread, workspace: NativeWorkspace, deps: AppImportApplyDeps): Promise<WorkspaceRef> {
  const target = await deps.canonicalPath(thread.worktreePath ?? thread.cwd);
  for (const checkout of workspace.checkouts ?? []) {
    if (await deps.canonicalPath(checkout.path) === target) return checkout;
  }
  return workspace.workspace;
}

/** Registers each project with the execution host once per run and finds its Nora workspace. */
function workspaceResolver(deps: AppImportApplyDeps): (project: AppImportProject) => Promise<{ boot: NativeBoot; workspace: NativeWorkspace } | null> {
  const registered = new Map<string, Promise<NativeBoot>>();
  return async (project) => {
    let boot = registered.get(project.id);
    if (!boot) {
      boot = deps.projects.register(project.id);
      registered.set(project.id, boot);
    }
    const state = await boot;
    const workspace = state.workspaces.find((entry) => entry.shellProjectId === project.id);
    return workspace ? { boot: state, workspace } : null;
  };
}

async function importThread(thread: AppImportThread, boot: NativeBoot, workspace: NativeWorkspace, deps: AppImportApplyDeps): Promise<{ outcome: AppImportItemOutcome; conversationId?: string }> {
  const checkout = await checkoutFor(thread, workspace, deps);
  // A resumable thread keeps the provider that owns its session; a read-only one only needs somewhere to live.
  const binding = await resolveImportBinding({ provider: thread, model: thread.model ?? null, allowFallback: !thread.resumable }, boot, checkout, deps);
  if (binding.status === "blocked") return { outcome: { status: "failed", message: binding.message } };
  const role = effectiveRole(boot.personalization, workspace.id);
  const title = threadTitle(thread);
  const create = { kind: "create", commandId: appImportIdentity(thread.importKey, "create"), conversationId: appImportIdentity(thread.importKey, "conversation"),
    title, workspace: checkout, provider: binding.binding, parentId: null, ...(role ? { role } : {}) } satisfies ConversationCommand;
  let conversationId: string;
  if (thread.resumable && thread.nativeSessionId) {
    conversationId = (await deps.conversations.execute({ ...create, externalSessionId: thread.nativeSessionId })).conversationId;
    // Adopting a native session takes the CLI's title; keep the one the user saw in the source app.
    await deps.conversations.execute({ kind: "rename", commandId: appImportIdentity(thread.importKey, "rename"), conversationId, title });
  } else {
    conversationId = (await deps.conversations.importHistory(create, transcriptHistory(thread))).conversationId;
  }
  if (thread.archived) await deps.conversations.execute({ kind: "archive", commandId: appImportIdentity(thread.importKey, "archive"), conversationId });
  return { outcome: APPLIED, conversationId };
}

/**
 * Resumable threads adopt their native Claude/Codex session and carry on where they left off; the rest
 * become read-only threads built from the messages the source app kept.
 */
export const applyThreads: AppImportItemApplier<"thread"> = async (items, context, deps) => {
  const outcomes = new Map<AppImportKey, AppImportItemOutcome>();
  const pinnedConversationIds: string[] = [];
  const resolveWorkspace = workspaceResolver(deps);
  for (const { item } of items) {
    context.report(`Importing thread ${threadTitle(item)}`);
    const project = context.projects.get(item.workspaceImportKey);
    if (!project) {
      outcomes.set(item.importKey, { status: "failed", message: "Import this thread's workspace first." });
      continue;
    }
    try {
      const resolved = await resolveWorkspace(project);
      if (!resolved) {
        outcomes.set(item.importKey, { status: "failed", message: "This thread's workspace isn't available to agents yet." });
        continue;
      }
      const result = await importThread(item, resolved.boot, resolved.workspace, deps);
      outcomes.set(item.importKey, result.outcome);
      if (result.conversationId && item.pinned && !item.archived) pinnedConversationIds.push(result.conversationId);
    } catch (error) {
      outcomes.set(item.importKey, failed(error, "Nora couldn't import this thread."));
    }
  }
  return { outcomes, renderer: { pinnedConversationIds } };
};
