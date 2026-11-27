import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { orcaSource } from "@main/app-import/sources/orca/source";
import { SECRET_MARKER, expectPlan, fakeSessions, readContext, testEnvironment, withTempHome, writeJson } from "../../../../helpers/appImport";

interface SplitDomain { depth: number; legacyRevisionMatches: boolean; stalePayload: unknown }

/** Mirrors Orca's depth-first split (one part per entry down to `depth` object levels). */
function splitDomain(value: unknown, depth: number, prefix: string[] = []): Array<{ key: string; payload: string }> {
  if (depth > 0 && typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length > 0) {
    return Object.entries(value).flatMap(([key, child]) => splitDomain(child, depth - 1, [...prefix, key]));
  }
  return [{ key: JSON.stringify(prefix), payload: JSON.stringify(value) }];
}

function createProfileDatabase(file: string, domains: Record<string, unknown>, split: Record<string, SplitDomain> = {}, userVersion = 3): void {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA user_version = ${userVersion};
    CREATE TABLE profile_state_documents (domain TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, domain_version INTEGER NOT NULL, revision INTEGER NOT NULL, updated_at INTEGER NOT NULL, content_hash TEXT NOT NULL);
    CREATE TABLE profile_state_document_parts_meta (domain TEXT PRIMARY KEY NOT NULL, domain_version INTEGER NOT NULL, revision INTEGER NOT NULL, updated_at INTEGER NOT NULL, content_hash TEXT NOT NULL, legacy_revision INTEGER);
    CREATE TABLE profile_state_document_parts (domain TEXT NOT NULL, part_key TEXT NOT NULL, ordinal INTEGER NOT NULL, payload TEXT NOT NULL, content_hash TEXT NOT NULL, PRIMARY KEY (domain, part_key));
  `);
  const insert = db.prepare("INSERT INTO profile_state_documents VALUES (?, ?, 1, ?, 0, 'h')");
  for (const [domain, value] of Object.entries(domains)) {
    const options = split[domain];
    insert.run(domain, JSON.stringify(options ? options.stalePayload : value), 7);
    if (!options) continue;
    db.prepare("INSERT INTO profile_state_document_parts_meta VALUES (?, 1, 8, 0, 'h', ?)").run(domain, options.legacyRevisionMatches ? 7 : 6);
    splitDomain(value, options.depth).forEach((part, ordinal) => db.prepare("INSERT INTO profile_state_document_parts VALUES (?, ?, ?, ?, 'h')").run(domain, part.key, ordinal, part.payload));
  }
  db.close();
}

function orcaUserData(home: string): string {
  return path.join(home, "Library", "Application Support", "orca");
}

function profileFixture(repoPath: string, worktreePath: string): Record<string, unknown> {
  const worktreeId = `repo-1::${worktreePath}`;
  return {
    schemaVersion: 1,
    repos: [
      { id: "repo-1", path: repoPath, displayName: "Local repo", hookSettings: { mode: "override", scripts: { setup: "pnpm install", archive: "" } }, ghAccount: { login: SECRET_MARKER } },
      { id: "repo-ssh", path: "/srv/remote", displayName: "Remote repo", connectionId: "ssh-1" }
    ],
    worktreeMeta: { [worktreeId]: { displayName: "Feature", isPinned: true, isArchived: false, baseRef: "origin/main" } },
    workspaceSession: {
      activeRepoId: "repo-1",
      tabsByWorktree: {
        [worktreeId]: [
          { id: "tab-1", title: "claude", customTitle: "Refactor auth", createdAt: Date.parse("2026-03-01T09:00:00Z"), launchAgent: "claude", aiVaultTitle: { agent: "claude", sessionId: "claude-live", title: "auth" } },
          { id: "tab-2", title: "codex", customTitle: null, createdAt: Date.parse("2026-03-01T09:30:00Z"), launchAgent: "codex" },
          { id: "tab-3", title: "zsh", customTitle: null, createdAt: Date.parse("2026-03-01T09:40:00Z") }
        ]
      },
      sleepingAgentSessionsByPaneKey: {
        "tab-4:leaf": { paneKey: "tab-4:leaf", tabId: "tab-4", worktreeId: `local|${worktreeId}`, agent: "codex", providerSession: { key: "session_id", id: "codex-gone", cwd: worktreePath },
          prompt: "Add tests\nfor the parser", lastAssistantMessage: "Added 3 tests.", state: "done", capturedAt: Date.parse("2026-03-02T10:00:00Z"), updatedAt: Date.parse("2026-03-02T11:00:00Z") },
        "x:leaf": { paneKey: "x:leaf", worktreeId: "repo-ssh::/srv/remote", agent: "claude", providerSession: { key: "session_id", id: "remote" }, prompt: "", state: "done", capturedAt: 0, updatedAt: 0 }
      }
    },
    workspaceSessionsByHostId: { "ssh:1": {} },
    settings: {
      theme: "dark", defaultTuiAgent: "claude", branchPrefix: "custom", branchPrefixCustom: "dc", workspaceDir: "/Users/someone/orca/workspaces",
      terminalDefaultShell: "/bin/zsh", agentCmdOverrides: { claude: "/opt/claude", gemini: "gemini-beta" }, agentDefaultArgs: { codex: "--search" },
      agentDefaultEnv: { claude: { ANTHROPIC_API_KEY: SECRET_MARKER, CLAUDE_CODE_MAX_OUTPUT: "64000" } },
      terminalQuickCommands: [
        { id: "q1", label: "Tests", command: "pnpm test", appendEnter: true },
        { id: "q2", label: "Review", action: "agent-prompt", agent: "codex", prompt: "Review this diff", scope: { type: "repo", repoId: "repo-1" } },
        { id: "q3", label: "Remote only", command: "ls", appendEnter: false, scope: { type: "repo", repoId: "repo-ssh" } }
      ],
      claudeManagedAccounts: [{ id: "a", token: SECRET_MARKER }], codexManagedAccounts: [{ id: "b", apiKey: SECRET_MARKER }],
      encryptedOpenAiKey: SECRET_MARKER
    },
    sshTargets: [{ id: "ssh-1", host: "example.com", password: SECRET_MARKER }]
  };
}

async function writeRepo(repoPath: string): Promise<void> {
  await mkdir(repoPath, { recursive: true });
  await writeFile(path.join(repoPath, "orca.yaml"), "scripts:\n  setup: |\n    npm ci\n  archive: rm -rf tmp\ndefaultTabs:\n  - title: Server\n    command: npm run dev\n  - title: Empty\n");
}

test("Orca profile database: reassembles split domains and maps repos, sessions, settings and keybindings", async () => {
  await withTempHome(async (home) => {
    const userData = orcaUserData(home);
    const repoPath = path.join(home, "dev", "repo");
    const worktreePath = path.join(home, "orca", "workspaces", "feature");
    await writeRepo(repoPath);
    await writeJson(path.join(userData, "orca-profile-index.json"), { schemaVersion: 1, activeProfileId: "work", profiles: [{ id: "default" }, { id: "work" }] });
    await mkdir(path.join(userData, "profiles", "work"), { recursive: true });
    const fixture = profileFixture(repoPath, worktreePath);
    createProfileDatabase(path.join(userData, "profiles", "work", "profile-state.db"), fixture, {
      // Parts are authoritative: the legacy row is stale.
      workspaceSession: { depth: 2, legacyRevisionMatches: true, stalePayload: {} },
      // An older Orca rewrote the legacy row after the split, so the legacy row wins.
      worktreeMeta: { depth: 1, legacyRevisionMatches: false, stalePayload: fixture.worktreeMeta }
    });
    await writeJson(path.join(home, ".orca", "keybindings.json"), {
      version: 1,
      keybindings: { "worktree.new": "Mod+N", "tab.close": null, "worktree.palette": ["Mod+K", "Mod+P"] },
      platforms: { darwin: { "terminal.split": "Cmd+D" }, linux: { "terminal.split": "Ctrl+Shift+D" } }
    });
    const env = testEnvironment(home);

    const detection = await orcaSource.detect(env);
    assert.deepEqual(detection, { status: "found", source: "orca", dataPath: path.join(userData, "profiles", "work", "profile-state.db"), format: { source: "orca", store: "profileStateDb", version: 3 } });

    const plan = expectPlan(await orcaSource.readPlan(readContext(env, fakeSessions({ claude: ["claude-live"] }))));
    assert.deepEqual(plan.workspaces, [{ importKey: "orca:workspace:repo-1", name: "Local repo", path: repoPath, pathExists: true, pinned: false, archived: false }]);
    // Orca runs the local setup script instead of orca.yaml's when no source policy is set; archive has no local script.
    assert.deepEqual(plan.setupScripts.map(({ phase, command, origin }) => ({ phase, command, origin })), [
      { phase: "setup", command: "pnpm install", origin: "appSettings" },
      { phase: "archive", command: "rm -rf tmp", origin: "repoFile" }
    ]);
    assert.deepEqual(plan.terminalPresets, [
      { importKey: "orca:terminalPreset:repo-1:defaultTab:0", workspaceImportKey: "orca:workspace:repo-1", label: "Server", origin: "defaultTab", action: "command", command: "npm run dev", appendEnter: true },
      { importKey: "orca:terminalPreset:quickCommand:q1", workspaceImportKey: null, label: "Tests", origin: "quickCommand", action: "command", command: "pnpm test", appendEnter: true },
      { importKey: "orca:terminalPreset:quickCommand:q2", workspaceImportKey: "orca:workspace:repo-1", label: "Review", origin: "quickCommand", action: "agentPrompt", agent: { provider: "codex", sourceProvider: "codex" }, prompt: "Review this diff" }
    ]);
    assert.deepEqual(plan.threads, [
      { importKey: "orca:thread:codex:codex-gone", workspaceImportKey: "orca:workspace:repo-1", title: "Add tests", provider: "codex", sourceProvider: "codex", nativeSessionId: "codex-gone",
        cwd: worktreePath, worktreePath, pinned: true, archived: false, createdAt: "2026-03-02T10:00:00.000Z", updatedAt: "2026-03-02T11:00:00.000Z", resumable: false,
        transcript: { completeness: "partial", messages: [
          { role: "user", text: "Add tests\nfor the parser", createdAt: "2026-03-02T10:00:00.000Z" },
          { role: "assistant", text: "Added 3 tests.", createdAt: "2026-03-02T11:00:00.000Z" }
        ] } },
      { importKey: "orca:thread:claude:claude-live", workspaceImportKey: "orca:workspace:repo-1", title: "Refactor auth", provider: "claude", sourceProvider: "claude", nativeSessionId: "claude-live",
        cwd: worktreePath, worktreePath, pinned: true, archived: false, createdAt: "2026-03-01T09:00:00.000Z", updatedAt: "2026-03-01T09:00:00.000Z", resumable: true }
    ]);
    assert.deepEqual(plan.settings.map((setting) => setting.importKey), [
      "orca:setting:theme", "orca:setting:defaultProvider", "orca:setting:cliBinaryPath:claude", "orca:setting:cliBinaryPath:gemini", "orca:setting:cliDefaultArgs:codex",
      "orca:setting:defaultShell", "orca:setting:branchPrefix", "orca:setting:worktreeBaseDir"
    ]);
    assert.deepEqual(plan.settings.find((setting) => setting.kind === "branchPrefix"), { kind: "branchPrefix", prefix: "dc", importKey: "orca:setting:branchPrefix", sourceKey: "settings.branchPrefix" });
    assert.deepEqual(plan.settings.find((setting) => setting.kind === "cliBinaryPath" && setting.provider.provider === "other"),
      { kind: "cliBinaryPath", provider: { provider: "other", sourceProvider: "gemini" }, path: "gemini-beta", importKey: "orca:setting:cliBinaryPath:gemini", sourceKey: "settings.agentCmdOverrides.gemini" });
    assert.deepEqual(plan.envVars, [{ importKey: "orca:envVar:claude:CLAUDE_CODE_MAX_OUTPUT", name: "CLAUDE_CODE_MAX_OUTPUT", value: "64000", scope: { kind: "provider", provider: { provider: "claude", sourceProvider: "claude" } }, sensitive: true, selectedByDefault: false }]);
    assert.deepEqual(plan.keybindings.map(({ commandId, accelerator }) => `${commandId}=${accelerator}`), ["close-active-session-tab=null", "open-workspace-quick-search=CmdOrCtrl+K"]);
    const skipped = plan.skipped.map((item) => `${item.kind}:${item.label}`);
    assert.deepEqual(skipped.sort(), [
      "account:2 managed Claude/Codex accounts", "keybinding:terminal.split (Cmd+D)", "keybinding:worktree.new (Mod+N)", "keybinding:worktree.palette (Mod+P)", "remoteWorkspace:Remote repo", "remoteWorkspace:Sessions on 1 remote hosts", "secret:claude environment variable ANTHROPIC_API_KEY",
      "sshTarget:1 SSH targets", "thread:1 agent sessions without a local repository", "thread:1 agent terminals without a recorded session"
    ]);
    assert.ok(!JSON.stringify(plan).includes(SECRET_MARKER), "plan must not contain secret values");
    assert.deepEqual(plan.warnings, []);
  });
});

test("Orca refuses a profile database newer than schema 3", async () => {
  await withTempHome(async (home) => {
    const userData = orcaUserData(home);
    await writeJson(path.join(userData, "orca-profile-index.json"), { schemaVersion: 1, activeProfileId: "p", profiles: [{ id: "p" }] });
    await mkdir(path.join(userData, "profiles", "p"), { recursive: true });
    createProfileDatabase(path.join(userData, "profiles", "p", "profile-state.db"), { repos: [] }, {}, 4);
    const detection = await orcaSource.detect(testEnvironment(home));
    assert.equal(detection.status, "unsupported");
    assert.match(detection.status === "unsupported" ? detection.reason : "", /newer Orca \(schema 4\)/);
    assert.equal((await orcaSource.readPlan(readContext(testEnvironment(home)))).status, "unsupported");
  });
});

test("Orca falls back to the profile JSON, then to the root JSON and its backups", async () => {
  await withTempHome(async (home) => {
    const userData = path.join(home, "xdg", "orca");
    const env = testEnvironment(home, { platform: "linux", xdgConfigHome: path.join(home, "xdg") });
    const repoPath = path.join(home, "repo");
    await mkdir(repoPath, { recursive: true });
    assert.equal((await orcaSource.detect(env)).status, "notFound");

    await writeFile(path.join(home, "placeholder"), "");
    await mkdir(userData, { recursive: true });
    await writeFile(path.join(userData, "orca-data.json"), "{ truncated");
    await writeJson(path.join(userData, "orca-data.json.bak.0"), { schemaVersion: 1, repos: [{ id: "legacy", path: repoPath }], settings: { theme: "light" } });
    const legacy = expectPlan(await orcaSource.readPlan(readContext(env)));
    assert.deepEqual(legacy.source.format, { source: "orca", store: "legacyJson", version: 1 });
    assert.deepEqual(legacy.workspaces.map((workspace) => workspace.importKey), ["orca:workspace:legacy"]);
    assert.deepEqual(legacy.settings.map((setting) => setting.kind), ["theme"]);

    await writeJson(path.join(userData, "orca-profile-index.json"), { schemaVersion: 1, activeProfileId: "missing", profiles: [{ id: "../escape" }, { id: "home" }] });
    await writeJson(path.join(userData, "profiles", "home", "orca-data.json"), { schemaVersion: 2, repos: [{ id: "profile", path: repoPath, displayName: "Profile repo" }] });
    const profile = expectPlan(await orcaSource.readPlan(readContext(env)));
    assert.deepEqual(profile.source.format, { source: "orca", store: "profileJson", version: 2 });
    assert.deepEqual(profile.workspaces.map((workspace) => workspace.name), ["Profile repo"]);
  });
});
