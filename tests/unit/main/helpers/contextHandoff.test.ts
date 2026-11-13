import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildContextHandoff, HANDOFF_MAX_BYTES, prepareContextHandoff } from "@main/helpers/contextHandoff";
import type { AgentContextEntry, AgentContextState } from "@shared/types/agentContext.types";

const entry = (id: string, content: string, kind: AgentContextEntry["kind"] = "user-prompt"): AgentContextEntry => ({
  id, agentId: "agent", projectId: "project", sessionId: "session", worktreeId: "checkout", createdAt: "2026-11-12T00:00:00Z",
  kind, precision: "exact", source: "harness", title: id, content, preview: content.slice(0, 80),
  estimate: { characters: content.length, estimatedTokens: Math.ceil(content.length / 4) }, references: [], sourceAgentIds: []
});
const source = (entries: AgentContextEntry[]): AgentContextState => ({ agentId: "agent", agentName: "Archived agent", toolLabel: "Codex",
  contextFilePath: "/unused", contextEventsPath: "/unused", terminalStreamPath: "/unused", entries, estimate: { characters: 0, estimatedTokens: 0 } });

test("small history stays intact and ordered, with a reference for later retrieval", () => {
  const result = buildContextHandoff([entry("original", "Goal"), entry("reply", "Done", "agent-output")], "/archive/index.md");
  assert.ok(result.includes("/archive/index.md"));
  assert.ok(result.includes("original\nGoal")); assert.ok(result.includes("reply\nDone"));
  assert.ok(result.indexOf("original\nGoal") < result.indexOf("reply\nDone"));
});

test("handoffs bound UTF-8 bytes, omit oversized entries whole, and preserve original and recent work", () => {
  const history = [entry("original", "Keep the original constraints"), entry("oversized", "😀".repeat(10_000)),
    ...Array.from({ length: 12 }, (_, i) => entry(`older-${i}`, "界".repeat(900), "agent-output")),
    entry("recent-user", "Current task"), entry("recent-answer", "Current progress", "agent-output")];
  const result = buildContextHandoff(history, "/archive/index.md");
  assert.ok(Buffer.byteLength(result) <= HANDOFF_MAX_BYTES);
  assert.ok(result.includes("Keep the original constraints"));
  assert.ok(result.includes("Current task")); assert.ok(result.includes("Current progress"));
  assert.ok(!result.includes("😀"));
  assert.ok(result.indexOf("Keep the original constraints") < result.indexOf("Current progress"));
});

test("only selected entries are archived in full, independently of source changes", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nora-handoff-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const selected = entry("selected", "Full large selected history\n".repeat(2_000));
  const canonical = source([entry("private", "Unselected secret"), selected, entry("recent", "Latest instruction")]);
  const deps = { storageRoot: root, async readSource(id: string) { assert.equal(id, "agent"); return canonical; } };
  const prompt = await prepareContextHandoff([{ sourceAgentId: "agent", entryIds: ["selected", "recent"],
    externalHarness: { primaryArtifactPath: "/untrusted/path" } }], deps);
  const directories = await fs.readdir(path.join(root, "context-handoffs"));
  assert.equal(directories.length, 1);
  const directory = path.join(root, "context-handoffs", directories[0]!);
  const original = selected.content; selected.content = "Changed source";
  assert.equal(await fs.readFile(path.join(directory, "entry-1.md"), "utf8"), original);
  assert.equal(await fs.readFile(path.join(directory, "entry-2.md"), "utf8"), "Latest instruction");
  assert.deepEqual((await fs.readdir(directory)).sort(), ["entry-1.md", "entry-2.md", "index.md"]);
  const index = await fs.readFile(path.join(directory, "index.md"), "utf8");
  assert.ok(index.includes(path.join(directory, "entry-1.md")));
  assert.ok(!index.includes("private")); assert.ok(!prompt.includes("Unselected secret"));
  assert.ok(!prompt.includes("Full large selected history")); assert.ok(prompt.includes("Latest instruction"));
  assert.ok(Buffer.byteLength(prompt) <= HANDOFF_MAX_BYTES);
  const second = await prepareContextHandoff([{ sourceAgentId: "agent", entryIds: ["recent"] }], deps);
  assert.notEqual(prompt, second);
});

test("missing selections and malformed payloads fail before creating an archive", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nora-handoff-invalid-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const deps = { storageRoot: root, async readSource() { return source([]); } };
  await assert.rejects(prepareContextHandoff([{ sourceAgentId: "agent", entryIds: ["missing"] }], deps), /unavailable/);
  await assert.rejects(prepareContextHandoff([{ sourceAgentId: "agent", entryIds: "invalid" }], deps));
  assert.equal(await prepareContextHandoff([], deps), ""); assert.deepEqual(await fs.readdir(root), []);
});

test("overlapping groups read each source once and do not duplicate history", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nora-handoff-dedup-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let reads = 0;
  const prompt = await prepareContextHandoff([
    { sourceAgentId: "agent", entryIds: ["first"] },
    { sourceAgentId: "agent", entryIds: ["first", "second"] }
  ], { storageRoot: root, async readSource() { reads++; return source([entry("first", "Original task"), entry("second", "Recent task")]); } });
  assert.equal(reads, 1);
  assert.equal(prompt.split("Original task").length, 2);
  const [name] = await fs.readdir(path.join(root, "context-handoffs"));
  assert.equal((await fs.readdir(path.join(root, "context-handoffs", name!))).length, 3);
});
