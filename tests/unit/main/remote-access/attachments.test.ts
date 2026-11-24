import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRuntimeApi } from "@main/remote-access/http/handler";
import { saveComposerAttachment } from "@main/helpers/composerAttachments";
import { remoteAttachmentResponseSchema, runtimeBodyLimit } from "@shared/remote-access/attachments";
import { runtimeInfoSchema } from "@shared/remote-access/runtimeApi";
import { REMOTE_LIMITS } from "@shared/remote-access/constants";
import { runtimeFixture } from "./runtimeFixture";

const input = { name: "screenshot.png", mimeType: "image/png", data: Buffer.from("image bytes").toString("base64") };

test("an authenticated upload stores app-owned files and advertises the capability only when configured", async (t) => {
  const f = runtimeFixture(t);
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "nora-remote-attachments-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const api = createRuntimeApi({ ...f.options, attachments: { save: (payload) => saveComposerAttachment(payload, directory) } });
  const upload = async (body: object, token = "owner.token.signature") => api.handle(new Request("https://runtime/v1/attachments", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body)
  }));
  assert.equal((await upload(input, "other.token.signature")).status, 403);
  assert.equal((await upload({ ...input, data: "not base64!" })).status, 400);
  assert.equal((await upload({ ...input, path: "/etc/overwrite" })).status, 400);
  const bytes = Buffer.alloc(300_000, 1);
  const response = await upload({ ...input, name: "../../screenshot.png", data: bytes.toString("base64") });
  assert.equal(response.status, 200);
  const { attachment } = remoteAttachmentResponseSchema.parse(await response.json());
  assert.equal(path.dirname(attachment.path), path.join(directory, "chat-attachments"));
  assert.equal(attachment.size, bytes.length);
  assert.deepEqual(await fs.readFile(attachment.path), bytes);
  const infoRequest = () => new Request("https://runtime/v1/runtime/info", { headers: { Authorization: "Bearer owner.token.signature" } });
  assert.equal(runtimeInfoSchema.parse(await (await api.handle(infoRequest())).json()).capabilities.includes("attachments.upload"), true);
  assert.equal(runtimeInfoSchema.parse(await (await f.api.handle(infoRequest())).json()).capabilities.includes("attachments.upload"), false);
  f.disable();
  assert.equal((await upload(input)).status, 403);
});

test("only the upload endpoint accepts file-sized bodies and unsupported hosts refuse uploads", async (t) => {
  const f = runtimeFixture(t);
  assert.equal(runtimeBodyLimit("POST", "/v1/conversations"), REMOTE_LIMITS.maxBodyBytes);
  assert.equal(runtimeBodyLimit("GET", "/v1/attachments"), REMOTE_LIMITS.maxBodyBytes);
  assert.ok(runtimeBodyLimit("POST", "/v1/attachments") > 20 * 1024 * 1024);
  assert.equal((await f.request("/v1/attachments", input)).status, 503);
  assert.equal((await f.request("/v1/conversations", { instruction: "x".repeat(300_000) })).status, 413);
});
