import { settingsPortsFixture } from "./settingsFixture";
import { secretsFixture } from "../secrets/fixture";
import { createNoraToolOperations } from "@main/nora-tools/operations/index";
import { openBotMemoryStore } from "@main/bots/memory/store";
import { snapshotBot } from "@shared/bots/snapshot";
import { putStoredBot } from "@shared/bots/settingsMutations";
import { noraToolsStatus } from "@shared/nora-tools/catalog";
import { DEFAULT_APP_SETTINGS, createDefaultWorkspaceTaskBoard } from "@shared/appTypes";
import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { Conversation, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ConversationHeader, ConversationSummary } from "@shared/types/conversation/queries.types";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import type { WorkspaceTaskBoard, WorkspaceTaskSummary } from "@shared/appTypes";
import { bot } from "../../shared/bots/fixtures";
import { normalizeLoopDefinition } from "@main/loops/loopValidation";
import type { LoopDefinition, LoopRun, LoopRunStatus, StartLoopRunPayload, ReportLoopStagePayload } from "@shared/appTypes";
import type { NoraRoutineStore, NoraTerminalStore, NoraWorkflowRunPlacement, NoraWorkflowStore } from "@main/types/nora-tools/operations.types";

/** An in-memory stand-in for the app's workflow runner that keeps its real definition validation. */
export function workflowFake() {
  let definitions: LoopDefinition[] = [];
  let runs: LoopRun[] = [];
  const started: StartLoopRunPayload[] = [];
  const saved: LoopDefinition[] = [];
  const reported: ReportLoopStagePayload[] = [];
  const state = { placement: "worktree" as NoraWorkflowRunPlacement, failPreparation: null as string | null };
  const project = (projectId: string): void => { if (projectId !== "shell-w") throw new Error("wrong project"); };
  const setStatus = async (projectId: string, runId: string, status: LoopRunStatus): Promise<LoopRun> => {
    project(projectId);
    const run = runs.find((entry) => entry.id === runId);
    if (!run) throw new Error("Workflow run could not be found.");
    const next = { ...run, status };
    runs = runs.map((entry) => entry.id === runId ? next : entry);
    return next;
  };
  const store: NoraWorkflowStore = {
    runPlacement: (projectId) => { project(projectId); return state.placement; },
    runner: {
      async reportStage(input) { reported.push(input); },
      async listDefinitions(projectId) { project(projectId); return definitions; },
      async saveDefinition(payload) {
        project(payload.projectId);
        const definition = normalizeLoopDefinition(payload, `2026-11-15T00:00:0${saved.length}.000Z`);
        saved.push(definition);
        definitions = [definition, ...definitions.filter((entry) => entry.id !== definition.id)];
        return definition;
      },
      async listRuns(projectId) { project(projectId); return runs; },
      async getRun(projectId, runId) { project(projectId); return runs.find((entry) => entry.id === runId) ?? null; },
      async startRun(payload) {
        started.push(payload);
        const definition = definitions.find((entry) => entry.id === payload.definitionId);
        if (!definition) throw new Error("Workflow could not be found.");
        const failed = state.failPreparation;
        const run: LoopRun = { id: `run${runs.length + 1}`, projectId: payload.projectId, definitionId: definition.id, definition, objective: payload.objective,
          specPath: null, taskPath: payload.taskPath ?? null, handoffPath: null, limits: definition.limits, status: failed ? "paused" : "running", stopReason: failed,
          sessionId: null, worktreeId: null, worktreePath: failed ? null : "/w/.worktrees/run", outputLog: "", outputEvents: [],
          roles: definition.stages.map((role) => ({ roleId: role.id, kind: role.kind, name: role.name, toolId: role.toolId, model: role.model, instructions: role.instructions })),
          iterations: [], events: [{ id: "e1", kind: "created", createdAt: "2026-11-15T00:00:00.000Z", message: "Workflow run created.", roleId: null, iteration: null }],
          activeRoleId: null, activeToken: null, createdAt: "2026-11-15T00:00:00.000Z", startedAt: failed ? null : "2026-11-15T00:00:01.000Z",
          updatedAt: "2026-11-15T00:00:01.000Z", completedAt: null };
        runs = [run, ...runs];
        return run;
      },
      pauseRun: (projectId, runId) => setStatus(projectId, runId, "paused"),
      resumeRun: (projectId, runId) => setStatus(projectId, runId, "running"),
      cancelRun: (projectId, runId) => setStatus(projectId, runId, "cancelled")
    }
  };
  return { store, started, saved, reported, state, get definitions() { return definitions; }, get runs() { return runs; }, set runs(next: LoopRun[]) { runs = next; } };
}

export const workspace = { environmentId: "local", projectId: "w", checkoutId: "c", path: "/w", branch: "main", access: "write" as const, versionControl: "git" as const };
export function conversation(id: string, extra: Partial<Conversation> = {}): Conversation {
  return { id, title: id, workspace, parentId: null, nativeConversationId: null,
    provider: { kind: "claude", instanceId: "claude", model: "claude-opus-5-5", reasoning: "high", permissionPolicy: "default" },
    role: null, archivedAt: null, createdAt: "2026-11-13T00:00:00.000Z", updatedAt: "2026-11-13T00:00:00.000Z", queuePaused: false, ...extra };
}
const message = (id: string, role: "user" | "assistant", text: string, complete = true): TimelineItem =>
  ({ kind: "message", id, runId: "r", createdAt: `2026-11-13T00:00:0${id.length}.000Z`, role, text, complete });

const codexCatalog = { status: "available", catalog: { models: [{ id: "gpt-6", name: "GPT-6" }], policies: [], capabilities: {} } } as unknown as ProviderCatalogResult;
const offline: ProviderCatalogResult = { status: "unavailable", failure: { code: "provider", message: "offline", retryable: true } };

export function noraFixture(extra: { terminals?: NoraTerminalStore; routines?: NoraRoutineStore } = {}) {
  let boot: NativeBoot = { environmentId: "local", cursor: 0, noraTools: noraToolsStatus("idle"), sharedBots: [],
    personalization: { defaultRole: { id: "general" }, workspaceRoles: {}, bots: { global: [bot("ada")], workspaces: {} } },
    workspaces: [{ id: "w", name: "Web", kind: "repository", shellProjectId: "shell-w", workspace },
      { id: "personal", name: "Personal", kind: "personal", workspace: { ...workspace, projectId: "personal", path: "/personal", versionControl: "none" } }],
    providers: [{ kind: "claude", instanceId: "claude", label: "Claude", reportsMcp: true }, { kind: "codex", instanceId: "codex", label: "Codex", reportsMcp: true }] };
  const conversations = new Map<string, Conversation>([
    ["plain", conversation("plain", { updatedAt: "2026-11-13T03:00:00.000Z" })],
    ["older", conversation("older", { title: "Older work", updatedAt: "2026-11-13T01:00:00.000Z" })],
    ["settled", conversation("settled", { archivedAt: "2026-11-13T02:00:00.000Z", updatedAt: "2026-11-13T02:00:00.000Z" })],
    ["elsewhere", conversation("elsewhere", { workspace: { ...workspace, projectId: "personal" } })],
    ["bot", conversation("bot", { bot: snapshotBot(bot("ada")) })]]);
  const items = new Map<string, TimelineItem[]>([["older", [message("a", "user", "Plan the release"), { kind: "tool", id: "t", runId: "r", createdAt: "2026-11-13T00:00:02.000Z", label: "ls", output: "x", state: "completed" },
    message("bb", "assistant", "Here is the plan."), message("ccc", "assistant", "partial", false)]]]);
  const saved: BotDefinition[] = [];
  let tasks: WorkspaceTaskSummary[] = [{ path: ".nora/tasks/a.md", title: "First", updatedAt: null, completed: false }, { path: ".nora/tasks/b.md", title: "Second", updatedAt: null, completed: false }];
  let board: WorkspaceTaskBoard = { ...createDefaultWorkspaceTaskBoard(), taskPositions: { ".nora/tasks/a.md": { sectionId: "done", order: 0 }, ".nora/tasks/b.md": { sectionId: "todo", order: 0 } } };
  const summary = (entry: Conversation): ConversationSummary => ({ conversation: entry, latestRun: null, queuedCount: 0, pendingRequestCount: 0 });
  const header = (entry: Conversation): ConversationHeader => ({ conversation: entry, activeRuns: [], queuedRuns: [], pendingRequests: [] } as unknown as ConversationHeader);
  let sequence = 0;
  const memory = openBotMemoryStore(":memory:", { now: () => "2026-11-13T00:00:00.000Z", nextId: () => `note${++sequence}` });
  let settings = structuredClone(DEFAULT_APP_SETTINGS);
  let settingsNotifications = 0;
  const taskNotifications: string[] = [];
  const workflows = workflowFake();
  const secrets = secretsFixture();
  const deps = createNoraToolOperations({
    secrets: secrets.service,
    apps: {} as never, connectorTools: {} as never,
    ...settingsPortsFixture(),
    readSettings: () => settings,
    async updateSettings(change) { settings = change(settings); return settings; },
    onSettingsChanged() { settingsNotifications += 1; },
    onTasksChanged: (projectId) => { taskNotifications.push(projectId); },
    nextId: () => `id${++sequence}`, memory,
    host: {
      header: (id) => { const found = conversations.get(id); return found ? header(found) : null; },
      summaries: () => [...conversations.values()].map(summary),
      conversationHistory: ({ conversationId }) => ({ schemaVersion: 1, conversationId, cursor: 1, nextBefore: null, scope: "timeline", items: items.get(conversationId) ?? [] }),
      catalog: async (kind) => kind === "codex" ? codexCatalog : offline,
      async execute() { throw new Error("unused"); }, subscribe: () => () => {}, eventCursor: () => 0
    },
    boot: () => boot,
    workflows: workflows.store,
    async saveBot(definition, previousScope) {
      const stored = { ...definition, revision: previousScope ? definition.revision + 1 : 1 };
      saved.push(stored);
      if (stored.scope.kind === "workspace" && stored.scope.storage === "shared") boot = { ...boot, sharedBots: [{ workspaceId: "w", bots: [stored], problems: [] }] };
      else boot = { ...boot, personalization: { ...boot.personalization, bots: putStoredBot(boot.personalization.bots, stored) } };
    },
    tasks: {
      async read(_projectId, path) { const task = tasks.find((entry) => entry.path === path); if (!task) throw new Error("Missing task"); return `# ${task.title}\n\nComplete the work.`; },
      async move(_projectId, fromPath, toPath) {
        tasks = tasks.map((task) => task.path === fromPath ? { ...task, path: toPath, completed: toPath.startsWith(".nora/tasks/completed/") } : task);
        // The real workspace move can prune source entries before saving the renamed board.
        const taskPositions = { ...board.taskPositions };
        delete taskPositions[fromPath];
        board = { ...board, taskPositions };
      },
      async list(projectId) { if (projectId !== "shell-w") throw new Error("wrong project"); return tasks; },
      async board() { return board; },
      async saveBoard(_projectId, next) { board = next; return board; },
      async create(_projectId, title, content) {
        const path = `.nora/tasks/${title.toLowerCase()}.md`;
        tasks = [...tasks, { path, title: content.split("\n")[0].replace("# ", ""), updatedAt: null, completed: false }];
        board = { ...board, taskPositions: { ...board.taskPositions, [path]: { sectionId: "todo", order: 1 } } };
        return path;
      }
    },
    ...(extra.terminals ? { terminals: extra.terminals } : {}),
    ...(extra.routines ? { routines: extra.routines } : {})
  });
  return { taskNotifications, workflows, secrets, deps, saved, conversations, items, memory, get settings() { return settings; }, get settingsNotifications() { return settingsNotifications; }, get board() { return board; }, get tasks() { return tasks; } };
}
