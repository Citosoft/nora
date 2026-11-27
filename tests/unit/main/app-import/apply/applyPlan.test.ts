import assert from "node:assert/strict";
import test from "node:test";
import { applyAppImportPlans } from "@main/app-import/apply/applyPlan";
import { noraToolsStatus } from "@shared/nora-tools/catalog";
import type { AppImportApplyDeps, AppImportProject } from "@main/types/app-import/appImportApply.types";
import type { SuppliedHistory } from "@main/types/execution/externalSessions.types";
import type { AppImportKey, AppImportPlan } from "@shared/types/app-import/appImportPlan.types";
import type { ConversationCommand } from "@shared/types/conversation/contracts.types";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { TerminalPreset } from "@shared/types/system.types";
import type { WorkspaceSetupScriptInput } from "@shared/types/workspaceSetupScript.types";
import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { PausedRoutineInput } from "@shared/types/bots/routines.types";
import type { NewBotMemory } from "@main/types/bots/memory.types";
import { claudeProvider, pickerCatalog } from "../../../renderer/modelPickerFixtures";

const NEW = "t3-code:workspace:new";
const EXISTING = "t3-code:workspace:existing";
const MISSING = "t3-code:workspace:missing";

function plan(): AppImportPlan {
  return {
    source: { id: "t3-code", displayName: "T3 Code", dataPath: "/home/.t3/userdata", format: { source: "t3-code", schema: "v2", migration: 81 } },
    workspaces: [
      { importKey: NEW, name: "New app", path: "/repos/new", pathExists: true, pinned: false, archived: false },
      { importKey: EXISTING, name: "Existing app", path: "/repos/existing", pathExists: true, pinned: false, archived: false },
      { importKey: MISSING, name: "Gone app", path: "/repos/gone", pathExists: false, pinned: false, archived: false }
    ],
    threads: [
      { importKey: "t3-code:thread:live", workspaceImportKey: NEW, title: "Live thread", provider: "claude", sourceProvider: "claudeAgent", model: "second", nativeSessionId: "session-1",
        cwd: "/repos/new", pinned: true, archived: false, createdAt: "2026-01-01T10:00:00.000Z", updatedAt: "2026-01-01T11:00:00.000Z", resumable: true },
      { importKey: "t3-code:thread:old", workspaceImportKey: EXISTING, title: "Old thread", provider: "codex", sourceProvider: "codex", nativeSessionId: "gone",
        cwd: "/repos/existing", pinned: true, archived: true, createdAt: "2026-01-01T10:00:00.000Z", updatedAt: "2026-01-01T11:00:00.000Z", resumable: false,
        transcript: { completeness: "full", messages: [{ role: "user", text: "Hello", createdAt: "2026-01-01T10:00:00.000Z" }, { role: "assistant", text: "Hi", createdAt: "2026-01-01T10:00:01.000Z" }] } },
      { importKey: "t3-code:thread:orphan", workspaceImportKey: MISSING, title: "Orphan", provider: "claude", sourceProvider: "claudeAgent", cwd: "/repos/gone",
        pinned: false, archived: false, createdAt: "2026-01-01T10:00:00.000Z", updatedAt: "2026-01-01T11:00:00.000Z", resumable: false,
        transcript: { completeness: "partial", messages: [{ role: "user", text: "Hello", createdAt: "2026-01-01T10:00:00.000Z" }] } }
    ],
    setupScripts: [{ importKey: "t3-code:setupScript:new:setup", workspaceImportKey: NEW, phase: "setup", label: "Install", command: "npm ci", origin: "appSettings" }],
    terminalPresets: [{ importKey: "t3-code:terminalPreset:dev", workspaceImportKey: null, label: "Dev", origin: "projectScript", action: "command", command: "npm run dev", appendEnter: true }],
    settings: [
      { importKey: "t3-code:setting:theme", sourceKey: "client-settings.json#theme", kind: "theme", theme: "t3-dark" },
      { importKey: "t3-code:setting:model", sourceKey: "settings.json#model", kind: "defaultModel", model: { provider: "claude", sourceProvider: "claudeAgent", model: "second" } },
      { importKey: "t3-code:setting:prefix", sourceKey: "settings.json#branchPrefix", kind: "branchPrefix", prefix: "t3/" }
    ],
    keybindings: [{ importKey: "t3-code:keybinding:sidebar", sourceCommand: "sidebar.toggle", sourceChord: "mod+shift+y", commandId: "toggle-workspace-sidebar", accelerator: "CmdOrCtrl+Shift+Y" }],
    envVars: [{ importKey: "t3-code:envVar:KEY", name: "OPENAI_API_KEY", value: "secret", scope: { kind: "global" }, sensitive: true, selectedByDefault: false }],
    bots: [],
    skipped: [],
    warnings: []
  };
}

function nativeWorkspace(project: AppImportProject): NativeWorkspace {
  return { id: `ws-${project.id}`, name: project.id, shellProjectId: project.id, kind: "repository",
    workspace: { projectId: `ws-${project.id}`, environmentId: "local", checkoutId: `checkout-${project.id}`, path: project.rootPath, branch: "main", access: "write" } };
}

/** In-memory Nora: records every call so tests can check order, arguments and idempotency. */
function fakeNora(options: { failOpen?: string } = {}) {
  const calls: string[] = [];
  const projects: AppImportProject[] = [{ id: "existing", rootPath: "/repos/existing" }, { id: "current", rootPath: "/repos/current" }];
  let active = "/repos/current";
  const ledger = new Set<AppImportKey>();
  const scripts = new Map<string, WorkspaceSetupScriptInput[]>();
  let globalPresets: TerminalPreset[] = [{ id: "mine", name: "Mine", workingDirectory: "", commands: ["ls"] }];
  const commands: ConversationCommand[] = [];
  const histories: SuppliedHistory[] = [];
  const secrets = new Map<string, string>([["EXISTING", "x"]]);
  const savedBots: { bot: BotDefinition; routines: PausedRoutineInput[] }[] = [];
  const memories: NewBotMemory[] = [];
  const boot = (): NativeBoot => ({ environmentId: "local", cursor: 0, personalization: { defaultRole: null, workspaceRoles: {} }, sharedBots: [], noraTools: noraToolsStatus("idle"),
    providers: [claudeProvider, { ...claudeProvider, kind: "codex", label: "Codex" }], workspaces: projects.map(nativeWorkspace) });
  const deps: AppImportApplyDeps = {
    ledger: { importedKeys: async () => new Set(ledger), record: async (keys) => { for (const key of keys) ledger.add(key); } },
    canonicalPath: async (path) => path,
    projects: {
      list: () => [...projects],
      activePath: () => active,
      async open(path) {
        calls.push(`open ${path}`);
        if (path === options.failOpen) throw new Error("Permission denied");
        active = path;
        let project = projects.find((entry) => entry.rootPath === path);
        if (!project) {
          project = { id: path.split("/").pop() ?? path, rootPath: path };
          projects.push(project);
        }
        return { status: "opened", project };
      },
      async register(projectId) { calls.push(`register ${projectId}`); return boot(); }
    },
    setupScripts: { async saveImported(projectId, importerId, list) { calls.push(`scripts ${projectId} ${importerId}`); scripts.set(projectId, list); } },
    terminalPresets: {
      workspacePresets: () => [],
      async saveWorkspacePresets() { throw new Error("unexpected"); },
      globalPresets: () => globalPresets,
      async saveGlobalPresets(presets) { calls.push("presets"); globalPresets = presets; }
    },
    conversations: {
      boot,
      catalog: async (kind, instanceId) => pickerCatalog({ kind, instanceId }),
      async execute(command) { calls.push(`execute ${command.kind}`); commands.push(command); return { commandId: command.commandId, conversationId: command.conversationId, cursor: 1, acceptedAt: "2026-01-01T00:00:00.000Z" }; },
      async importHistory(command, history) { calls.push("importHistory"); commands.push(command); histories.push(history); return { commandId: command.commandId, conversationId: command.conversationId, cursor: 1, acceptedAt: "2026-01-01T00:00:00.000Z" }; }
    },
    settings: { async setThreadModel(model) { calls.push(`model ${model.kind}/${model.model}`); } },
    keybindings: { async applyKeybindingOverrides(overrides) {
      calls.push(`keybindings ${JSON.stringify(overrides)}`);
      return { applied: Object.entries(overrides).map(([commandId, accelerator]) => ({ commandId: commandId === "toggle-workspace-sidebar" ? commandId : "open-settings", accelerator })), conflicts: [], displaced: [], unknown: [], invalid: [] };
    } },
    secrets: { has: ({ name }) => secrets.has(name), save: (secret) => { calls.push(`secret ${secret.name}`); secrets.set(secret.name, secret.value); } },
    bots: { async save(bot, routines) { calls.push(`bot ${bot.id}`); savedBots.push({ bot, routines }); }, addMemory: (note) => { memories.push(note); } }
  };
  return { deps, calls, ledger, scripts, commands, histories, secrets, savedBots, memories, get globalPresets() { return globalPresets; }, get active() { return active; } };
}

function everything(source: AppImportPlan): Set<AppImportKey> {
  return new Set([...source.workspaces, ...source.threads, ...source.setupScripts, ...source.terminalPresets, ...source.settings, ...source.keybindings].map((item) => item.importKey));
}

test("apply runs in order, reports every item and restores the active project", async () => {
  const nora = fakeNora();
  const output = await applyAppImportPlans([{ plan: plan(), selectedKeys: everything(plan()) }], nora.deps);
  const outcome = new Map(output.items.map((item) => [item.importKey, item.outcome]));
  assert.deepEqual(outcome.get(NEW), { status: "applied" });
  assert.deepEqual(outcome.get(EXISTING), { status: "alreadyImported" });
  assert.equal(outcome.get(MISSING)?.status, "skipped");
  assert.deepEqual(outcome.get("t3-code:thread:live"), { status: "applied" });
  assert.deepEqual(outcome.get("t3-code:thread:old"), { status: "applied" });
  assert.deepEqual(outcome.get("t3-code:thread:orphan"), { status: "failed", message: "Import this thread's workspace first." });
  assert.deepEqual(outcome.get("t3-code:setting:prefix"), { status: "skipped", reason: "Nora has no branch prefix setting." });
  assert.equal(nora.calls.filter((call) => call.startsWith("secret")).length, 0, "env vars are never applied unless ticked");
  assert.deepEqual(nora.calls, [
    "open /repos/new",
    "scripts new t3-code",
    "presets",
    "register new", "execute create", "execute rename",
    "register existing", "importHistory", "execute archive",
    "model claude/second",
    `keybindings ${JSON.stringify({ "toggle-workspace-sidebar": "CmdOrCtrl+Shift+Y" })}`,
    "open /repos/current"
  ]);
  assert.equal(nora.active, "/repos/current");
  assert.deepEqual(output.renderer, { themeMode: "dark", pinnedConversationIds: [nora.commands[0]?.conversationId] }, "archived threads are not pinned");
  const create = nora.commands[0];
  assert.ok(create?.kind === "create" && create.externalSessionId === "session-1" && create.provider.model === "second" && create.provider.permissionPolicy === "read");
  assert.equal(nora.histories[0]?.nativeConversationId, null);
  assert.deepEqual(nora.scripts.get("new"), [{ name: "Install", command: "npm ci", trigger: "worktree-create", origin: { kind: "imported", importerId: "t3-code", externalId: "t3-code:setupScript:new:setup" } }]);
  assert.deepEqual(nora.globalPresets.map((preset) => preset.name), ["Mine", "Dev"]);
});

test("a second run repeats nothing and records only successes", async () => {
  const nora = fakeNora();
  await applyAppImportPlans([{ plan: plan(), selectedKeys: everything(plan()) }], nora.deps);
  assert.ok(!nora.ledger.has("t3-code:thread:orphan"), "failed items are offered again");
  nora.calls.length = 0;
  const output = await applyAppImportPlans([{ plan: plan(), selectedKeys: everything(plan()) }], nora.deps);
  assert.deepEqual(nora.calls, [], "nothing new to do");
  assert.equal(output.items.find((item) => item.importKey === "t3-code:thread:live")?.outcome.status, "alreadyImported");
});

test("one failing workspace doesn't stop the rest", async () => {
  const nora = fakeNora({ failOpen: "/repos/new" });
  const output = await applyAppImportPlans([{ plan: plan(), selectedKeys: everything(plan()) }], nora.deps);
  const outcome = new Map(output.items.map((item) => [item.importKey, item.outcome]));
  assert.deepEqual(outcome.get(NEW), { status: "failed", message: "Permission denied" });
  assert.deepEqual(outcome.get("t3-code:setupScript:new:setup"), { status: "failed", message: "Import this script's workspace first." });
  assert.deepEqual(outcome.get("t3-code:thread:live"), { status: "failed", message: "Import this thread's workspace first." });
  assert.deepEqual(outcome.get("t3-code:thread:old"), { status: "applied" });
  assert.deepEqual(outcome.get("t3-code:keybinding:sidebar"), { status: "applied" });
});

test("ticked env vars go to secrets without overwriting an existing one", async () => {
  const nora = fakeNora();
  const source = plan();
  source.envVars.push({ importKey: "t3-code:envVar:EXISTING", name: "EXISTING", value: "new", scope: { kind: "global" }, sensitive: true, selectedByDefault: false });
  const output = await applyAppImportPlans([{ plan: source, selectedKeys: new Set(["t3-code:envVar:KEY", "t3-code:envVar:EXISTING"]) }], nora.deps);
  assert.equal(nora.secrets.get("OPENAI_API_KEY"), "secret");
  assert.equal(nora.secrets.get("EXISTING"), "x");
  assert.deepEqual(output.items.map((item) => item.outcome.status), ["applied", "skipped"]);
});

test("re-importing setup scripts keeps the ones an earlier run imported", async () => {
  const nora = fakeNora();
  const source = plan();
  source.setupScripts.push({ importKey: "t3-code:setupScript:new:archive", workspaceImportKey: NEW, phase: "archive", label: "Clean", command: "rm -rf tmp", origin: "appSettings" });
  await applyAppImportPlans([{ plan: source, selectedKeys: new Set([NEW, "t3-code:setupScript:new:setup"]) }], nora.deps);
  await applyAppImportPlans([{ plan: source, selectedKeys: new Set(["t3-code:setupScript:new:archive"]) }], nora.deps);
  assert.deepEqual(nora.scripts.get("new")?.map((script) => script.trigger), ["worktree-create", "worktree-archive"]);
});

test("apps that share a project folder import it once, and each app's items find it", async () => {
  const nora = fakeNora();
  const claude: AppImportPlan = { ...plan(), source: { id: "claude", displayName: "Claude", dataPath: "/home/.claude/projects", format: { source: "claude", store: "sessionHistory" } },
    workspaces: [{ importKey: "claude:workspace:new", name: "new", path: "/repos/new", pathExists: true, pinned: false, archived: false }],
    threads: [], setupScripts: [], terminalPresets: [], settings: [], keybindings: [], envVars: [] };
  const output = await applyAppImportPlans([
    { plan: claude, selectedKeys: new Set(["claude:workspace:new"]) },
    { plan: plan(), selectedKeys: new Set([NEW, "t3-code:thread:live"]) }
  ], nora.deps);
  assert.deepEqual(output.items.map((item) => `${item.source} ${item.importKey} ${item.outcome.status}`), [
    "claude claude:workspace:new applied",
    `t3-code ${NEW} alreadyImported`,
    "t3-code t3-code:thread:live applied"
  ]);
  assert.deepEqual(nora.calls.filter((call) => call.startsWith("open")), ["open /repos/new", "open /repos/current"], "the folder opens once and the active project is restored once");
});

test("bots become global Nora bots with their memory, routines arriving paused, and a stable face", async () => {
  const nora = fakeNora();
  const source: AppImportPlan = { ...plan(), source: { id: "bot-export", displayName: "Bot export from Grok Bot", dataPath: "", format: { source: "bot-export", version: 1, origin: "Grok Bot" } },
    workspaces: [], threads: [], setupScripts: [], terminalPresets: [], settings: [], keybindings: [], envVars: [],
    bots: [{ importKey: "bot-export:bot:Grok%20Bot:Scout", name: "Scout", role: "Finds news", instructions: "Be brief.", model: { provider: "other", sourceProvider: "xai", model: "grok-4.5" },
      avatar: { shape: "clover", palette: "teal" }, memory: ["Likes tea", "Works in London"],
      routines: [{ name: "Morning brief", instruction: "Summarise the news", schedule: { kind: "daily", time: "08:00" }, timezone: "Europe/London" }], adjustments: [] }] };
  const output = await applyAppImportPlans([{ plan: source, selectedKeys: new Set(["bot-export:bot:Grok%20Bot:Scout"]) }], nora.deps);
  assert.deepEqual(output.items.map((item) => item.outcome.status), ["applied"]);
  const saved = nora.savedBots[0];
  assert.ok(saved);
  assert.equal(saved.bot.id, "scout");
  assert.deepEqual(saved.bot.scope, { kind: "global" });
  assert.equal(saved.bot.binding.kind, "claude", "a model Nora can't run falls back to the default provider");
  assert.equal(saved.bot.avatar.shape, "clover");
  assert.deepEqual(saved.routines.map((routine) => [routine.name, routine.active, routine.timezone, routine.workspaceId]), [["Morning brief", false, "Europe/London", "ws-existing"]]);
  assert.deepEqual(nora.memories.map((note) => note.text), ["Works in London", "Likes tea"], "oldest first so the newest note stays on top");
  const again = await applyAppImportPlans([{ plan: source, selectedKeys: new Set(["bot-export:bot:Grok%20Bot:Scout"]) }], nora.deps);
  assert.equal(again.items[0]?.outcome.status, "alreadyImported");
  assert.equal(nora.savedBots.length, 1);
});
