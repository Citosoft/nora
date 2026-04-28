import {
  buildAgentInputPayload,
  buildPlainTerminalInputWithWorkspacePaths,
  getWorkspacePathPillLabel
} from "@/components/app/logic/agentInputAttachments";
import type { PastedImageDraft, WorkspacePathAttachmentDraft } from "@/components/app/types/agentInput.types";
import assert from "node:assert/strict";
import test from "node:test";

const sampleImage: PastedImageDraft = {
  id: "1",
  path: "uploads/a.png",
  mimeType: "image/png",
  placeholder: "x",
  dataUrl: "data:image/png;base64,x"
};

test("buildAgentInputPayload combines text, images, and workspace paths", () => {
  const paths: WorkspacePathAttachmentDraft[] = [
    { id: "p1", path: "src/a.ts", kind: "file" },
    { id: "p2", path: "lib/", kind: "directory" }
  ];
  const out = buildAgentInputPayload("hello", [sampleImage], paths, null);
  assert.ok(out.startsWith("hello\n\n"));
  assert.ok(out.includes("Attached pasted image files:\n- uploads/a.png"));
  assert.ok(out.includes("Attached workspace paths:\n- src/a.ts\n- lib/"));
});

test("buildAgentInputPayload resolves workspace paths against root when provided", () => {
  const paths: WorkspacePathAttachmentDraft[] = [
    { id: "p1", path: "src/a.ts", kind: "file" },
    { id: "p2", path: "lib/", kind: "directory" }
  ];
  const out = buildAgentInputPayload("hello", [sampleImage], paths, "/tmp/project");
  assert.ok(out.includes("- /tmp/project/src/a.ts"));
  assert.ok(out.includes("- /tmp/project/lib/"));
});

test("buildAgentInputPayload path-only matches prior image-only shape", () => {
  const out = buildAgentInputPayload("", [sampleImage], [], null);
  assert.equal(out, "Attached pasted image files:\n- uploads/a.png");
});

test("buildPlainTerminalInputWithWorkspacePaths appends path block", () => {
  const paths: WorkspacePathAttachmentDraft[] = [{ id: "p1", path: "foo/bar.ts", kind: "file" }];
  assert.equal(
    buildPlainTerminalInputWithWorkspacePaths("cd .", paths, null),
    "cd .\n\nAttached workspace paths:\n- foo/bar.ts"
  );
  assert.equal(buildPlainTerminalInputWithWorkspacePaths("", paths, null), "Attached workspace paths:\n- foo/bar.ts");
});

test("buildPlainTerminalInputWithWorkspacePaths uses absolute paths when root provided", () => {
  const paths: WorkspacePathAttachmentDraft[] = [{ id: "p1", path: "foo/bar.ts", kind: "file" }];
  assert.equal(
    buildPlainTerminalInputWithWorkspacePaths("cd .", paths, "/tmp/ws"),
    "cd .\n\nAttached workspace paths:\n- /tmp/ws/foo/bar.ts"
  );
});

test("format passes through already-absolute draft paths", () => {
  const paths: WorkspacePathAttachmentDraft[] = [{ id: "p1", path: "/other/file.ts", kind: "file" }];
  assert.equal(
    buildPlainTerminalInputWithWorkspacePaths("x", paths, "/tmp/ws"),
    "x\n\nAttached workspace paths:\n- /other/file.ts"
  );
});

test("getWorkspacePathPillLabel shows basename and trailing slash for directories", () => {
  assert.equal(
    getWorkspacePathPillLabel({ id: "1", path: "src/components/", kind: "directory" }),
    "components/"
  );
  assert.equal(getWorkspacePathPillLabel({ id: "2", path: "src/components/Button.tsx", kind: "file" }), "Button.tsx");
});
