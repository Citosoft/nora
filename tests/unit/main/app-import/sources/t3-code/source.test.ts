import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { t3CodeSource } from "@main/app-import/sources/t3-code/source";
import { SECRET_MARKER, expectPlan, fakeSessions, readContext, testEnvironment, withTempHome, writeJson } from "../../../../helpers/appImport";

const PROJECT_SCRIPTS = JSON.stringify([
  { id: "install", name: "Install", command: "npm install", icon: "play", runOnWorktreeCreate: true },
  { id: "dev", name: "Dev server", command: "npm run dev", icon: "play", runOnWorktreeCreate: false },
  { id: "broken", name: "No command" }
]);

function createV2Database(file: string, workspace: string): DatabaseSync {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE effect_sql_migrations (migration_id INTEGER PRIMARY KEY, created_at TEXT, name TEXT);
    INSERT INTO effect_sql_migrations VALUES (80, '', 'a'), (81, '', 'b');
    CREATE TABLE projection_projects (project_id TEXT PRIMARY KEY, title TEXT NOT NULL, workspace_root TEXT NOT NULL, scripts_json TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, default_model_selection_json TEXT, project_icon_json TEXT, pinned_at TEXT, archived_at TEXT);
    CREATE TABLE orchestration_v2_projection_threads (thread_id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, default_provider TEXT NOT NULL,
      runtime_mode TEXT NOT NULL, interaction_mode TEXT NOT NULL, active_provider_thread_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      archived_at TEXT, deleted_at TEXT, payload_json TEXT NOT NULL, provider_instance_id TEXT);
    CREATE TABLE orchestration_v2_projection_messages (message_id TEXT PRIMARY KEY, thread_id TEXT NOT NULL, run_id TEXT, node_id TEXT, role TEXT NOT NULL,
      streaming INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, payload_json TEXT NOT NULL);
    CREATE TABLE orchestration_v2_projection_provider_threads (provider_thread_id TEXT PRIMARY KEY, thread_id TEXT, provider TEXT NOT NULL, status TEXT NOT NULL,
      updated_at TEXT NOT NULL, payload_json TEXT NOT NULL);
    CREATE TABLE provider_session_runtime (thread_id TEXT PRIMARY KEY, provider_name TEXT NOT NULL, adapter_key TEXT NOT NULL, status TEXT NOT NULL,
      last_seen_at TEXT NOT NULL, resume_cursor_json TEXT, runtime_payload_json TEXT);
    CREATE TABLE auth_sessions (session_id TEXT PRIMARY KEY, token TEXT);
    CREATE TABLE scheduled_tasks (id TEXT PRIMARY KEY, webhook_token TEXT);
    CREATE TABLE projection_threads (thread_id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE projection_thread_messages (message_id TEXT PRIMARY KEY, thread_id TEXT NOT NULL, role TEXT NOT NULL, text TEXT NOT NULL, is_streaming INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  `);
  const project = db.prepare("INSERT INTO projection_projects VALUES (?, ?, ?, ?, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', ?, ?, NULL, ?, NULL)");
  project.run("p1", "Main app", workspace, PROJECT_SCRIPTS, null, JSON.stringify({ instanceId: "claudeAgent", model: "claude-opus-4-1" }), "2026-01-02T00:00:00Z");
  project.run("p2", "Old app", path.join(workspace, "gone"), "[]", "2026-01-03T00:00:00Z", null, null);
  const thread = db.prepare("INSERT INTO orchestration_v2_projection_threads VALUES (?, ?, ?, ?, 'full-access', 'default', ?, ?, ?, ?, ?, ?, ?)");
  const payload = (extra: object): string => JSON.stringify({ branch: null, worktreePath: null, pinnedAt: null, lineage: { relationshipToParent: null }, ...extra });
  thread.run("t1", "p1", "Resumable Claude", "claudeAgent", "pt1", "2026-02-01T10:00:00.000Z", "2026-02-01T11:00:00.000Z", null, null,
    payload({ modelSelection: { instanceId: "claudeAgent", model: "claude-sonnet-4-5" }, branch: "feature/x", worktreePath: path.join(workspace, "wt"), pinnedAt: "2026-02-01T12:00:00Z" }), "claudeAgent");
  thread.run("t2", "p1", "Lost Codex", "codex", null, "2026-02-02T10:00:00.000Z", "2026-02-02T11:00:00.000Z", "2026-02-03T00:00:00Z", null,
    payload({ modelSelection: { instanceId: "codex_work", model: "gpt-5" } }), "codex_work");
  thread.run("t3", "p1", "Deleted", "codex", null, "2026-02-03T10:00:00Z", "2026-02-03T10:00:00Z", null, "2026-02-04T00:00:00Z", payload({}), "codex");
  thread.run("t4", "p1", "Subagent", "codex", null, "2026-02-03T10:00:00Z", "2026-02-03T10:00:00Z", null, null, payload({ lineage: { relationshipToParent: "subagent" } }), "codex");
  thread.run("t5", "p2", "Orphan", "codex", null, "2026-02-03T10:00:00Z", "2026-02-03T10:00:00Z", null, null, payload({}), "codex");
  db.prepare("INSERT INTO orchestration_v2_projection_provider_threads VALUES ('pt1', 't1', 'claudeAgent', 'idle', '', ?)")
    .run(JSON.stringify({ nativeThreadRef: { driver: "claudeAgent", nativeId: "claude-native-1", strength: "strong" } }));
  const runtime = db.prepare("INSERT INTO provider_session_runtime VALUES (?, ?, 'k', 'stopped', '', ?, ?)");
  runtime.run("t1", "claudeAgent", JSON.stringify({ resume: "stale-claude-id" }), JSON.stringify({ cwd: workspace }));
  runtime.run("t2", "codex", JSON.stringify({ threadId: "codex-native-2" }), JSON.stringify({ cwd: path.join(workspace, "sub") }));
  const message = db.prepare("INSERT INTO orchestration_v2_projection_messages VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?)");
  message.run("m1", "t2", "user", 0, "2026-02-02T10:00:00.000Z", "", JSON.stringify({ text: "Fix the build", attachments: [] }));
  message.run("m2", "t2", "assistant", 0, "2026-02-02T10:01:00.000Z", "", JSON.stringify({ text: "Done.", attachments: [] }));
  message.run("m3", "t2", "assistant", 1, "2026-02-02T10:02:00.000Z", "", JSON.stringify({ text: "streaming partial" }));
  message.run("m4", "t1", "user", 0, "2026-02-01T10:00:00.000Z", "", JSON.stringify({ text: "Only used as fallback" }));
  db.prepare("INSERT INTO auth_sessions VALUES ('s', ?)").run(SECRET_MARKER);
  db.prepare("INSERT INTO scheduled_tasks VALUES ('task', ?)").run(SECRET_MARKER);
  // Left open: the importer must read committed rows that are still only in the WAL.
  db.exec("PRAGMA wal_autocheckpoint = 0");
  return db;
}

async function writeT3Settings(stateDir: string): Promise<void> {
  await writeJson(path.join(stateDir, "settings.json"), {
    providerInstances: {
      codex_work: { driver: "codex", displayName: "Codex (work)", config: { binaryPath: "/opt/codex/bin/codex", apiKey: `${SECRET_MARKER}-key` },
        environment: [
          { name: "OPENAI_API_KEY", value: `${SECRET_MARKER}-env`, sensitive: false },
          { name: "CODEX_FLAGS", value: `${SECRET_MARKER}-flagged`, sensitive: true },
          { name: "REFERENCED", value: "", sensitive: true, secret: { provider: "keychain", id: SECRET_MARKER } },
          { name: "RUST_LOG", value: "info", sensitive: false }
        ] },
      claudeAgent: { driver: "claudeAgent", enabled: true, config: { binaryPath: "/usr/local/bin/claude" } }
    },
    worktreesDirectory: "/Users/someone/worktrees",
    branchNamePrefix: "dev",
    defaultTheme: "t3-dark",
    cloudSpeechCredentials: { openai: { apiKey: SECRET_MARKER } }
  });
  await writeJson(path.join(stateDir, "keybindings.json"), [
    { key: "mod+shift+k", command: "thread.new" },
    { key: "mod+j", command: "terminal.toggle", when: "terminalFocus" },
    { key: "mod+shift+y", command: "sidebar.toggle" },
    { key: "mod++", command: "chat.new" },
    { command: "missing.key" }
  ]);
  await mkdir(path.join(stateDir, "secrets"), { recursive: true });
  await writeFile(path.join(stateDir, "secrets", "store.json"), SECRET_MARKER);
  await writeFile(path.join(stateDir, "shell-environment-cache.json"), JSON.stringify({ TOKEN: SECRET_MARKER }));
}

test("T3 Code v2: detects, reads projects, threads, native ids, transcripts, settings and keybindings", async () => {
  await withTempHome(async (home) => {
    const stateDir = path.join(home, ".t3", "userdata");
    const workspace = path.join(home, "code", "app");
    await mkdir(workspace, { recursive: true });
    await mkdir(stateDir, { recursive: true });
    const writer = createV2Database(path.join(stateDir, "statev2.sqlite"), workspace);
    await writeT3Settings(stateDir);
    const env = testEnvironment(home);

    const detection = await t3CodeSource.detect(env);
    assert.deepEqual(detection, { status: "found", source: "t3-code", dataPath: path.join(stateDir, "statev2.sqlite"), format: { source: "t3-code", schema: "v2", migration: 81 } });

    const plan = expectPlan(await t3CodeSource.readPlan(readContext(env, fakeSessions({ claude: ["claude-native-1"] }))));
    assert.equal(plan.source.dataPath, stateDir);
    assert.deepEqual(plan.workspaces, [{ importKey: "t3-code:workspace:p1", name: "Main app", path: workspace, pathExists: true, pinned: true, archived: false,
      defaultModel: { provider: "claude", sourceProvider: "claudeAgent", model: "claude-opus-4-1" } }]);
    assert.deepEqual(plan.setupScripts, [{ importKey: "t3-code:setupScript:p1:install", workspaceImportKey: "t3-code:workspace:p1", phase: "setup", label: "Install", command: "npm install", origin: "appSettings" }]);
    assert.deepEqual(plan.terminalPresets, [{ importKey: "t3-code:terminalPreset:p1:dev", workspaceImportKey: "t3-code:workspace:p1", label: "Dev server", origin: "projectScript", action: "command", command: "npm run dev", appendEnter: true }]);

    assert.deepEqual(plan.threads, [
      { importKey: "t3-code:thread:t1", workspaceImportKey: "t3-code:workspace:p1", title: "Resumable Claude", provider: "claude", sourceProvider: "claudeAgent",
        model: "claude-sonnet-4-5", nativeSessionId: "claude-native-1", cwd: path.join(workspace, "wt"), branch: "feature/x", worktreePath: path.join(workspace, "wt"),
        pinned: true, archived: false, createdAt: "2026-02-01T10:00:00.000Z", updatedAt: "2026-02-01T11:00:00.000Z", resumable: true },
      { importKey: "t3-code:thread:t2", workspaceImportKey: "t3-code:workspace:p1", title: "Lost Codex", provider: "codex", sourceProvider: "codex",
        model: "gpt-5", nativeSessionId: "codex-native-2", cwd: path.join(workspace, "sub"), pinned: false, archived: true,
        createdAt: "2026-02-02T10:00:00.000Z", updatedAt: "2026-02-02T11:00:00.000Z", resumable: false,
        transcript: { completeness: "full", messages: [
          { role: "user", text: "Fix the build", createdAt: "2026-02-02T10:00:00.000Z" },
          { role: "assistant", text: "Done.", createdAt: "2026-02-02T10:01:00.000Z" }
        ] } }
    ]);

    assert.deepEqual(plan.settings.map((setting) => setting.kind).sort(), ["branchPrefix", "cliBinaryPath", "cliBinaryPath", "theme", "worktreeBaseDir"]);
    assert.deepEqual(plan.settings.find((setting) => setting.kind === "cliBinaryPath" && setting.provider.provider === "codex"),
      { kind: "cliBinaryPath", provider: { provider: "codex", sourceProvider: "codex" }, path: "/opt/codex/bin/codex", importKey: "t3-code:setting:cliBinaryPath:codex_work", sourceKey: "settings.json#providerInstances.codex_work.config.binaryPath" });
    assert.deepEqual(plan.envVars, [{ importKey: "t3-code:envVar:codex_work:RUST_LOG", name: "RUST_LOG", value: "info", scope: { kind: "provider", provider: { provider: "codex", sourceProvider: "codex" } }, sensitive: true, selectedByDefault: false }]);
    // terminal.toggle=mod+j repeats T3 Code's default, so it is dropped rather than overriding Nora's shortcut.
    assert.deepEqual(plan.keybindings, [
      { importKey: "t3-code:keybinding:sidebar.toggle:mod%2Bshift%2By:", sourceCommand: "sidebar.toggle", sourceChord: "mod+shift+y", commandId: "toggle-workspace-sidebar", accelerator: "CmdOrCtrl+Shift+Y" }
    ]);
    const skipped = plan.skipped.map((item) => `${item.kind}:${item.label}`);
    for (const expected of ["workspace:Old app", "thread:1 deleted threads", "thread:1 subagent threads", "thread:1 threads without a project", "secret:Codex (work) API key",
      "secret:Codex (work) environment variable OPENAI_API_KEY", "secret:Codex (work) environment variable CODEX_FLAGS", "secret:Codex (work) environment variable REFERENCED",
      "secret:Cloud speech credentials", "secret:T3 Code secret store", "account:Signed-in devices", "unsupported:Scheduled tasks",
      "keybinding:thread.new (mod+shift+k)", "keybinding:chat.new (mod++)"]) {
      assert.ok(skipped.includes(expected), `missing skipped item ${expected}`);
    }
    assert.ok(!JSON.stringify(plan).includes(SECRET_MARKER), "plan must not contain secret values");
    assert.deepEqual(plan.warnings, []);
    writer.close();
  });
});

test("T3 Code v1: reads legacy tables under T3CODE_HOME with resume cursors and transcripts", async () => {
  await withTempHome(async (home) => {
    const base = path.join(home, "custom-t3");
    const stateDir = path.join(base, "userdata");
    await mkdir(stateDir, { recursive: true });
    const db = new DatabaseSync(path.join(stateDir, "state.sqlite"));
    db.exec(`
      CREATE TABLE projection_projects (project_id TEXT PRIMARY KEY, title TEXT NOT NULL, workspace_root TEXT NOT NULL, scripts_json TEXT NOT NULL, created_at TEXT, updated_at TEXT, deleted_at TEXT);
      CREATE TABLE projection_threads (thread_id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, branch TEXT, worktree_path TEXT, latest_turn_id TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, model_selection_json TEXT);
      CREATE TABLE projection_thread_messages (message_id TEXT PRIMARY KEY, thread_id TEXT NOT NULL, turn_id TEXT, role TEXT NOT NULL, text TEXT NOT NULL, is_streaming INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE projection_thread_sessions (thread_id TEXT PRIMARY KEY, status TEXT NOT NULL, provider_name TEXT, updated_at TEXT NOT NULL);
      CREATE TABLE provider_session_runtime (thread_id TEXT PRIMARY KEY, provider_name TEXT NOT NULL, adapter_key TEXT NOT NULL, status TEXT NOT NULL, last_seen_at TEXT NOT NULL, resume_cursor_json TEXT, runtime_payload_json TEXT);
    `);
    db.prepare("INSERT INTO projection_projects VALUES ('p', 'Legacy', '/nowhere/legacy', '[]', '', '', NULL)").run();
    db.prepare("INSERT INTO projection_threads VALUES ('a', 'p', 'Claude v1', 'main', NULL, NULL, '2025-05-01T00:00:00Z', '2025-05-02T00:00:00Z', NULL, ?)").run(JSON.stringify({ provider: "claudeAgent", model: "claude-3-7" }));
    db.prepare("INSERT INTO projection_threads VALUES ('b', 'p', '', NULL, NULL, NULL, 'not a date', 'also bad', NULL, NULL)").run();
    db.prepare("INSERT INTO projection_thread_sessions VALUES ('b', 'ready', 'codex', '')").run();
    db.prepare("INSERT INTO provider_session_runtime VALUES ('a', 'claudeAgent', 'k', 'stopped', '', ?, NULL)").run(JSON.stringify({ resume: "claude-v1" }));
    db.prepare("INSERT INTO projection_thread_messages VALUES ('m', 'b', NULL, 'user', 'hello', 0, '2025-05-01T00:00:00Z', '')").run();
    db.close();
    const env = testEnvironment(home, { variables: { T3CODE_HOME: base } });

    const detection = await t3CodeSource.detect(env);
    assert.equal(detection.status, "found");
    assert.deepEqual(detection.status === "found" && detection.format, { source: "t3-code", schema: "v1", migration: null });
    const plan = expectPlan(await t3CodeSource.readPlan(readContext(env, fakeSessions({ claude: ["claude-v1"] }))));
    assert.equal(plan.workspaces[0]?.pathExists, false);
    assert.deepEqual(plan.threads.map(({ title, provider, model, nativeSessionId, branch, resumable, transcript, createdAt, updatedAt }) => ({ title, provider, model, nativeSessionId, branch, resumable, transcript, createdAt, updatedAt })), [
      { title: "Claude v1", provider: "claude", model: "claude-3-7", nativeSessionId: "claude-v1", branch: "main", resumable: true, transcript: undefined,
        createdAt: "2025-05-01T00:00:00.000Z", updatedAt: "2025-05-02T00:00:00.000Z" },
      { title: "Untitled thread", provider: "codex", model: undefined, nativeSessionId: undefined, branch: undefined, resumable: false,
        transcript: { completeness: "full", messages: [{ role: "user", text: "hello", createdAt: "2025-05-01T00:00:00.000Z" }] }, createdAt: "1970-01-01T00:00:00.000Z", updatedAt: "1970-01-01T00:00:00.000Z" }
    ]);
  });
});

test("T3 Code detection reports missing data and unrecognised databases", async () => {
  await withTempHome(async (home) => {
    const env = testEnvironment(home);
    const missing = await t3CodeSource.detect(env);
    assert.equal(missing.status, "notFound");
    assert.ok(missing.status === "notFound" && missing.searchedPaths.includes(path.join(home, ".t3", "userdata", "statev2.sqlite")));
    await mkdir(path.join(home, ".t3", "userdata"), { recursive: true });
    const db = new DatabaseSync(path.join(home, ".t3", "userdata", "statev2.sqlite"));
    db.exec("CREATE TABLE something_else (id TEXT)");
    db.close();
    assert.equal((await t3CodeSource.detect(env)).status, "unsupported");
    assert.equal((await t3CodeSource.readPlan(readContext(env))).status, "unsupported");
  });
});

test("T3 Code threads are not resumable when the session lookup fails", async () => {
  await withTempHome(async (home) => {
    const stateDir = path.join(home, ".t3", "userdata");
    await mkdir(stateDir, { recursive: true });
    createV2Database(path.join(stateDir, "statev2.sqlite"), home).close();
    const failing = { listSessionIds: async (): Promise<ReadonlySet<string>> => { throw new Error("history unavailable"); } };
    const plan = expectPlan(await t3CodeSource.readPlan(readContext(testEnvironment(home), failing)));
    assert.ok(plan.threads.every((thread) => !thread.resumable));
    assert.equal(plan.threads.find((thread) => thread.importKey === "t3-code:thread:t1")?.transcript?.messages[0]?.text, "Only used as fallback");
    assert.equal(plan.warnings.length, 2);
  });
});
