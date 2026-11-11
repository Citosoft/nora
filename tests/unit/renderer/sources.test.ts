import assert from "node:assert/strict";
import test from "node:test";
import { matchesThreadSource, threadAppSource, threadSourceOptions } from "@/components/app/logic/thread-workspace/sources";

test("per-app controls distinguish both providers and their CLI and desktop origins with matching logos", () => {
  for (const providerKind of ["codex", "claude"] as const) for (const origin of ["cli", "desktop"] as const) {
    const row = { providerKind, origin };
    const id = threadAppSource(row);
    assert.equal(id, `${providerKind}-${origin}`);
    assert.equal(threadSourceOptions.find((option) => option.id === id)?.providerKind, providerKind);
    assert.equal(matchesThreadSource(row, id), true);
    assert.equal(matchesThreadSource(row, "nora"), false);
    assert.equal(matchesThreadSource(row, "external"), true);
  }
  assert.equal(matchesThreadSource({ providerKind: "codex" }, "nora"), true);
  assert.equal(matchesThreadSource({ providerKind: "codex" }, "codex-cli"), false);
});
