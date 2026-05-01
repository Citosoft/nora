import { buildContextBundleMarkdown } from "@main/orchestrator/agentContextArtifacts";
import {
  buildImportedContextBundleListMetadata,
  computeImportedBundleApproxTokens,
  parseImportedContextBundleHeader
} from "@main/orchestrator/importedContextBundleMetadata";
import assert from "node:assert/strict";
import test from "node:test";

test("parseImportedContextBundleHeader extracts Nora bundle header and source sections", () => {
  const md = buildContextBundleMarkdown({
    bundleId: "b1",
    createdAt: "2026-04-30T12:00:00.000Z",
    targetAgent: { id: "a1", name: "Investigator", toolLabel: "Gemini CLI" },
    sources: [
      {
        agentId: "s1",
        agentName: "Scout",
        toolLabel: "Codex",
        entries: []
      },
      {
        agentId: "s2",
        agentName: "Helper",
        toolLabel: "Claude",
        entries: []
      }
    ]
  });
  const parsed = parseImportedContextBundleHeader(md);
  assert.equal(parsed.bundleId, "b1");
  assert.equal(parsed.generatedAt, "2026-04-30T12:00:00.000Z");
  assert.equal(parsed.targetAgent, "Investigator (Gemini CLI)");
  assert.deepEqual(parsed.sourceAgents, ["Scout (Codex)", "Helper (Claude)"]);
});

test("parseImportedContextBundleHeader returns nulls for empty input", () => {
  const parsed = parseImportedContextBundleHeader("");
  assert.equal(parsed.bundleId, null);
  assert.equal(parsed.generatedAt, null);
  assert.equal(parsed.targetAgent, null);
  assert.deepEqual(parsed.sourceAgents, []);
});

test("buildImportedContextBundleListMetadata sets primary source and token estimate from full markdown", () => {
  const md = buildContextBundleMarkdown({
    bundleId: "b1",
    createdAt: "2026-04-30T12:00:00.000Z",
    targetAgent: { id: "a1", name: "Investigator", toolLabel: "Gemini CLI" },
    sources: [
      {
        agentId: "s1",
        agentName: "Scout",
        toolLabel: "Codex",
        entries: []
      }
    ]
  });
  const meta = buildImportedContextBundleListMetadata(md, { fullMarkdownUtf8: md, byteSize: md.length });
  assert.equal(meta.primarySourceAgentLabel, "Scout (Codex)");
  assert.equal(meta.extraSourceAgentCount, 0);
  assert.ok(meta.approxEstimatedTokens != null);
  assert.ok(meta.approxEstimatedTokens! > 10);
});

test("computeImportedBundleApproxTokens falls back to byte size when full text missing", () => {
  const fromBytes = computeImportedBundleApproxTokens({ fullMarkdownUtf8: null, byteSize: 1200 });
  assert.equal(fromBytes, 100);
  assert.equal(computeImportedBundleApproxTokens({ fullMarkdownUtf8: "", byteSize: 0 }), null);
});
