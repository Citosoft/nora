import { buildAppUpdateDetails } from "@/components/app/logic/appUpdateDetails";
import assert from "node:assert/strict";
import test from "node:test";

const base = { kind: "available" as const, currentVersion: "0.2.2", latestVersion: "0.2.3" };

test("previews published Markdown and links to the full release", () => {
  const notes = "### Features\n\n- **New feature**\n\n### Fixes\n\n- A bug fix.";
  assert.deepEqual(buildAppUpdateDetails({ ...base, releaseNotes: notes, releaseUrl: "https://example.test/release" }), {
    title: "What’s new",
    markdown: `${notes}\n\n[View full release notes](https://example.test/release)`
  });
});

test("missing or blank notes offer the release page without blocking an update", () => {
  for (const releaseNotes of [undefined, null, "  "]) {
    const details = buildAppUpdateDetails({ ...base, releaseNotes, releaseUrl: "https://example.test/release" });
    assert.ok(details?.markdown.includes("Release notes aren’t available"));
    assert.ok(details?.markdown.includes("[View full release notes](https://example.test/release)"));
  }
});

test("downloaded updates can still show notes without a release URL", () => {
  assert.deepEqual(buildAppUpdateDetails({ ...base, kind: "downloaded", releaseNotes: "- A bug fix." }), {
    title: "What’s new", markdown: "- A bug fix."
  });
});

test("statuses without release details omit the section", () => {
  assert.equal(buildAppUpdateDetails(base), undefined);
  assert.equal(buildAppUpdateDetails({ kind: "idle", currentVersion: "0.2.2", latestVersion: null }), undefined);
});
