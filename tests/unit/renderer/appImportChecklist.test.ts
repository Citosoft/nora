import assert from "node:assert/strict";
import test from "node:test";
import { appImportBotTabs, appImportSelections, buildAppImportChecklist, groupSelection, isAppImportRowChecked, toggledRowSelection } from "@/components/app/logic/app-import/appImportChecklist";
import type { AppImportPreview } from "@shared/types/app-import/appImportApply.types";
import type { AppImportPlan } from "@shared/types/app-import/appImportPlan.types";

function emptyPlan(id: "claude" | "t3-code"): AppImportPlan {
  return { source: { id, displayName: id === "claude" ? "Claude" : "T3 Code", dataPath: "/data", format: id === "claude" ? { source: "claude", store: "sessionHistory" } : { source: "t3-code", schema: "v2", migration: 81 } },
    workspaces: [], threads: [], setupScripts: [], terminalPresets: [], settings: [], keybindings: [], envVars: [], bots: [], skipped: [], warnings: [] };
}

const previews: AppImportPreview["sources"] = [
  { status: "ready", source: "claude", importedKeys: ["claude:workspace:old"], plan: { ...emptyPlan("claude"), workspaces: [
    { importKey: "claude:workspace:app", name: "app", path: "/repos/app", pathExists: true, pinned: false, archived: false },
    { importKey: "claude:workspace:old", name: "old", path: "/repos/old", pathExists: true, pinned: false, archived: false }] } },
  { status: "notFound", source: "codex", searchedPaths: ["/home/.codex/sessions"] },
  { status: "ready", source: "t3-code", importedKeys: [], plan: { ...emptyPlan("t3-code"),
    workspaces: [{ importKey: "t3-code:workspace:app", name: "App", path: "/repos/app", pathExists: true, pinned: false, archived: false }],
    settings: [{ importKey: "t3-code:setting:theme", sourceKey: "theme", kind: "theme", theme: "dark" }],
    envVars: [{ importKey: "t3-code:envVar:KEY", name: "KEY", value: "x", scope: { kind: "global" }, sensitive: true, selectedByDefault: false }],
    bots: [{ importKey: "t3-code:bot:helper", name: "Helper", role: "", instructions: "", model: null, avatar: { shape: null, palette: null }, memory: [], routines: [], adjustments: [] }],
    skipped: [{ kind: "secret", label: "API key", reason: "Secrets are never imported." }, { kind: "bot", label: "Helper: tool", reason: "Connect it again." }] } }
];

test("the checklist merges a folder known to several apps into one row and summarises every app", () => {
  const checklist = buildAppImportChecklist(previews, [], "work");
  assert.deepEqual(checklist.sources.map((source) => `${source.name}: ${source.description}`), [
    "Claude: 2 projects", "Codex: Not found on this computer", "T3 Code: 1 project, 1 setting, 1 environment variable"
  ]);
  const projects = checklist.groups.find((group) => group.kind === "workspace")?.rows ?? [];
  assert.deepEqual(projects.map((row) => [row.label, row.sources, row.keys]), [
    ["app", ["claude", "t3-code"], ["claude:workspace:app", "t3-code:workspace:app"]],
    ["old", ["claude"], []]
  ]);
  assert.deepEqual([...checklist.defaultSelection].sort(), ["claude:workspace:app", "t3-code:setting:theme", "t3-code:workspace:app"]);
  assert.deepEqual(checklist.leftBehind, [{ source: "t3-code", label: "API key", reason: "Secrets are never imported." }]);
});

test("rows toggle all their keys, groups skip sensitive rows, and selections split back per app", () => {
  const checklist = buildAppImportChecklist(previews, [], "work");
  const app = checklist.groups[0]?.rows[0];
  assert.ok(app);
  let selected = toggledRowSelection(new Set(checklist.defaultSelection), app);
  assert.equal(isAppImportRowChecked(app, selected), false);
  selected = toggledRowSelection(selected, app);
  assert.equal(isAppImportRowChecked(app, selected), true);
  const envGroup = checklist.groups.find((group) => group.kind === "envVar");
  assert.ok(envGroup);
  assert.equal(groupSelection(selected, envGroup, true).has("t3-code:envVar:KEY"), false);
  assert.deepEqual(appImportSelections(new Set([...selected, "t3-code:envVar:KEY"]), checklist.keyTargets), [
    { source: "t3-code", selectedKeys: ["t3-code:setting:theme", "t3-code:workspace:app", "t3-code:envVar:KEY"] },
    { source: "claude", selectedKeys: ["claude:workspace:app"] }
  ]);
});

test("the bots scope shows only bots, with faces, and pasted exports travel with their selection", () => {
  const work = buildAppImportChecklist(previews, [], "work");
  assert.ok(!work.groups.some((group) => group.kind === "bot"), "onboarding keeps bots out of the work step");
  const exportPreview = { status: "ready" as const, source: "bot-export" as const, importedKeys: [], plan: { ...emptyPlan("t3-code"),
    source: { id: "bot-export" as const, displayName: "Bot export from Grok Bot", dataPath: "", format: { source: "bot-export" as const, version: 1 as const, origin: "Grok Bot" } },
    bots: [{ importKey: "bot-export:bot:Grok%20Bot:Scout", name: "Scout", role: "News", instructions: "", model: null, avatar: { shape: "clover" as const, palette: null }, memory: ["a"], routines: [], adjustments: [] }] } };
  const bots = buildAppImportChecklist(previews, [{ tab: "grok-bot", document: "{...}", preview: exportPreview }], "bots");
  assert.deepEqual(bots.groups.map((group) => group.kind), ["bot"]);
  assert.deepEqual(bots.groups[0]?.rows.map((row) => [row.label, row.avatar?.shape ?? null, row.detail]), [["Helper", null, "No instructions or memory to bring"], ["Scout", "clover", "News · 1 memory note"]]);
  assert.deepEqual(bots.leftBehind.map((item) => item.label), ["Helper: tool"]);
  assert.deepEqual(appImportSelections(new Set(bots.defaultSelection), bots.keyTargets), [
    { source: "t3-code", selectedKeys: ["t3-code:bot:helper"] },
    { source: "bot-export", document: "{...}", selectedKeys: ["bot-export:bot:Grok%20Bot:Scout"] }
  ]);
});

test("the bots step gets a tab per app with bots, and a Grok Bot tab fed by pasted exports", () => {
  const orca = { status: "ready" as const, source: "orca" as const, importedKeys: [], plan: { ...emptyPlan("t3-code"),
    source: { id: "orca" as const, displayName: "Orca", dataPath: "", format: { source: "orca" as const, store: "profileStateDb" as const, version: 3 } },
    bots: [{ importKey: "orca:bot:b1", name: "Scout", role: "", instructions: "", model: null, avatar: { shape: null, palette: null }, memory: [], routines: [], adjustments: [] }] } };
  const tabs = appImportBotTabs([orca, { status: "notFound", source: "openbot", searchedPaths: [] }], []);
  assert.deepEqual(tabs.map((tab) => [tab.id, tab.label, tab.checklist.groups.flatMap((group) => group.rows.map((row) => row.label))]), [
    ["orca", "Orca", ["Scout"]], ["openbot", "OpenBot", []], ["grok-bot", "Grok Bot", []]
  ]);
  assert.equal(tabs[1]?.checklist.sources[0]?.description, "Not found on this computer");
  assert.deepEqual(tabs.map((tab) => [tab.id, tab.exportGuide?.tab ?? null, tab.notice]), [["orca", null, null], ["openbot", "openbot", null], ["grok-bot", "grok-bot", null]]);
});

test("OpenBot connected to a server explains where its bots are, and lists exports pasted on its tab beside its local bots", () => {
  const openBot = { status: "ready" as const, source: "openbot" as const, importedKeys: [], plan: { ...emptyPlan("t3-code"),
    source: { id: "openbot" as const, displayName: "OpenBot", dataPath: "", format: { source: "openbot" as const, store: "database" as const, remoteServer: "citosoft" } },
    bots: [{ importKey: "openbot:bot:local", name: "Local", role: "", instructions: "", model: null, avatar: { shape: null, palette: null }, memory: [], routines: [], adjustments: [] }] } };
  const exported = (origin: string, name: string) => ({ status: "ready" as const, source: "bot-export" as const, importedKeys: [], plan: { ...emptyPlan("t3-code"),
    source: { id: "bot-export" as const, displayName: `Bot export from ${origin}`, dataPath: "", format: { source: "bot-export" as const, version: 1 as const, origin } },
    bots: [{ importKey: `bot-export:bot:${origin}:${name}`, name, role: "", instructions: "", model: null, avatar: { shape: null, palette: null }, memory: [], routines: [], adjustments: [] }] } });
  const tabs = appImportBotTabs([openBot], [
    { tab: "openbot", document: "server", preview: exported("OpenBot", "Sales Assistant") },
    { tab: "grok-bot", document: "grok", preview: exported("Grok Bot", "Scout") }
  ]);
  const byId = new Map(tabs.map((tab) => [tab.id, tab]));
  assert.match(byId.get("openbot")?.notice ?? "", /connected to the server "citosoft"/);
  assert.deepEqual(byId.get("openbot")?.checklist.groups.flatMap((group) => group.rows.map((row) => row.label)), ["Local", "Sales Assistant"]);
  assert.deepEqual(byId.get("grok-bot")?.checklist.groups.flatMap((group) => group.rows.map((row) => row.label)), ["Scout"]);
  assert.deepEqual(appImportSelections(new Set(byId.get("openbot")?.checklist.defaultSelection), byId.get("openbot")?.checklist.keyTargets ?? new Map()), [
    { source: "openbot", selectedKeys: ["openbot:bot:local"] },
    { source: "bot-export", document: "server", selectedKeys: ["bot-export:bot:OpenBot:Sales Assistant"] }
  ]);
});
