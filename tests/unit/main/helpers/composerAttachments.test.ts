import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { readComposerAttachmentThumbnail, saveComposerAttachment } from "@main/helpers/composerAttachments";
import { COMPOSER_ATTACHMENT_MAX_BYTES } from "@shared/composerAttachments";

test("attachment storage preserves bytes and names with unique paths inside app storage", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nora-attachments-test-"));
  try {
    const payload = { name: "../../my notes.txt", mimeType: "text/plain", data: new Uint8Array([1, 2, 3]) };
    const first = await saveComposerAttachment(payload, root);
    const second = await saveComposerAttachment(payload, root);
    assert.notEqual(first.path, second.path);
    assert.equal(path.dirname(first.path), path.join(root, "chat-attachments"));
    assert.equal(first.name, payload.name);
    assert.equal(first.size, 3);
    assert.deepEqual(await fs.readFile(first.path), Buffer.from(payload.data));
    const empty = await saveComposerAttachment({ name: "empty", mimeType: "", data: new Uint8Array() }, root);
    assert.equal(empty.mimeType, "application/octet-stream");
    assert.equal(empty.size, 0);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("attachment boundary rejects malformed and oversized payloads before writing", async () => {
  const invalid = [null, {}, { name: "", mimeType: "image/png", data: new Uint8Array() },
    { name: "file", mimeType: "text/plain", data: [1, 2] },
    { name: "big", mimeType: "text/plain", data: new Uint8Array(COMPOSER_ATTACHMENT_MAX_BYTES + 1) }];
  for (const payload of invalid) await assert.rejects(saveComposerAttachment(payload, "/unused"), /20 MB/);
});

test("image thumbnails are bounded WebP previews restored from the saved attachment", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nora-thumbnails-test-"));
  try {
    const data = await sharp({ create: { width: 600, height: 300, channels: 4, background: "red" } }).png().toBuffer();
    const attachment = await saveComposerAttachment({ name: "image.png", mimeType: "image/png", data }, root);
    const thumbnail = await readComposerAttachmentThumbnail(attachment.path, root);
    assert.ok(thumbnail);
    assert.ok(thumbnail.startsWith("data:image/webp;base64,"));
    const metadata = await sharp(Buffer.from(thumbnail.split(",")[1], "base64")).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 128);
    assert.equal(metadata.height, 64);
    assert.deepEqual(await fs.readFile(attachment.path), data, "preview generation preserves the original image");
    const file = await saveComposerAttachment({ name: "notes.txt", mimeType: "text/plain", data: Buffer.from("hello") }, root);
    assert.equal(await readComposerAttachmentThumbnail(file.path, root), null);
    assert.equal(await readComposerAttachmentThumbnail(`${attachment.path}-missing`, root), null);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("thumbnail reads reject files outside attachment storage, including symlinks", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nora-thumbnails-boundary-"));
  try {
    const directory = path.join(root, "chat-attachments");
    await fs.mkdir(directory);
    const outside = path.join(root, "outside.png");
    await sharp({ create: { width: 2, height: 2, channels: 3, background: "blue" } }).png().toFile(outside);
    assert.equal(await readComposerAttachmentThumbnail(outside, root), null);
    const link = path.join(directory, "link.png");
    await fs.symlink(outside, link);
    assert.equal(await readComposerAttachmentThumbnail(link, root), null);
    assert.equal(await readComposerAttachmentThumbnail(null, root), null);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
