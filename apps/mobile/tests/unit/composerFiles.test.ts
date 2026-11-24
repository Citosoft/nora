import { describe, expect, it } from "vitest";
import { base64FileBytes, validateComposerFiles } from "@/state/composerFiles";
import { buildComposerInstruction } from "@shared/conversations/composerInstruction";
import { COMPOSER_ATTACHMENT_MAX_BYTES } from "@shared/composerAttachments";
import { buildSendMessage } from "@/commands/commandBuilders";
import { pendingCommandSchema } from "@/commands/pendingCommandSchema";
import { createRuntimeClient } from "@/api/runtime/runtimeClient";
import { fakeFetch, json } from "./fixtures/fakeFetch";

const selected = { name: "notes.txt", uri: "file:///notes.txt", mimeType: "text/plain", size: 12 };
const attachment = { id: "file-1", name: "notes.txt", path: "/saved/notes.txt", mimeType: "text/plain", size: 12 };

describe("composer files", () => {
  it("checks batch count and file size before reading bytes", () => {
    expect(validateComposerFiles(0, [selected])).toBeNull();
    expect(validateComposerFiles(10, [selected])).toMatch(/up to 10/);
    expect(validateComposerFiles(0, [{ ...selected, size: COMPOSER_ATTACHMENT_MAX_BYTES + 1 }])).toMatch(/20 MB/);
    expect(validateComposerFiles(0, [{ ...selected, size: null }])).toBeNull();
    expect(["", "YQ==", "YWI=", "YWJj"].map(base64FileBytes)).toEqual([0, 1, 2, 3]);
  });

  it("sends and validates uploads at the authenticated runtime boundary", async () => {
    const { fetch, calls } = fakeFetch(() => json(200, { attachment }));
    const client = createRuntimeClient({ hostname: "abc123.remote.withnora.run", fetch, getToken: async () => "token", timeoutMs: 50, commandTimeoutMs: 50 });
    expect(await client.uploadAttachment({ name: selected.name, mimeType: selected.mimeType, data: "YWJj" })).toEqual(attachment);
    expect(calls[0]).toMatchObject({ method: "POST", url: "https://abc123.remote.withnora.run/v1/attachments", body: { name: selected.name, mimeType: selected.mimeType, data: "YWJj" } });
  });

  it("persists attachment-only instructions so retry keeps the original desktop file references", () => {
    let id = 0;
    const instruction = buildComposerInstruction("", [attachment]);
    const command = buildSendMessage({ createId: () => `id-${++id}`, now: () => new Date("2026-11-24T00:00:00Z") }, { runtimeId: "mac", conversationId: "chat", instruction });
    const restored = pendingCommandSchema.parse(JSON.parse(JSON.stringify(command)));
    expect(restored.kind === "send-message" && restored.instruction).toBe(instruction);
    expect(instruction).toContain(JSON.stringify(attachment.path));
  });
});
