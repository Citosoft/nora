import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { ExecutionHost } from "@main/execution/host";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import { itemOutputFile, readItemOutputFile } from "@main/execution/itemOutputs";
import type { TimelineItem, ToolActivity } from "@shared/types/conversation/contracts.types";
import { fixture, workspaceAuthority } from "./fixture";
import { ProviderDouble } from "./providerDouble";

const produced = (...paths: string[]): ToolActivity => ({ id: "output-call", runId: "run", createdAt: "2026-11-18T10:00:00.000Z", kind: "tool",
  label: "Write", output: "", state: "completed", details: { category: "file", outputFiles: paths.map((filePath) => ({ path: filePath })) } });

async function withImage(width: number, height: number, run: (filePath: string) => Promise<void>): Promise<void> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "nora-tool-output-test-"));
  try {
    const filePath = path.join(directory, "image.png");
    await sharp({ create: { width, height, channels: 4, background: "red" } }).png().toFile(filePath);
    await run(filePath);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
}

const at = "2026-11-18T10:00:00.000Z";
const reviewed = (...changes: [string, "added" | "modified" | "deleted"][]): TimelineItem => ({ id: "review", runId: "run", createdAt: at, kind: "review",
  result: { status: "ready", scope: "turn", attribution: "observed", baselineAt: at, capturedAt: at, changes: changes.map(([changePath, kind]) => ({
    path: changePath, kind, beforeMode: null, afterMode: "100644", beforeHash: null, afterHash: "a".repeat(64), patch: null, presentation: "binary" })) } });

test("only files an item recorded can be read or opened: a tool's absolute files, or a reviewed turn's files inside the checkout", () => {
  const item = produced("/out/report.pdf", "relative/chart.png");
  assert.equal(itemOutputFile(item, "/out/report.pdf", "/project"), "/out/report.pdf");
  assert.equal(itemOutputFile(item, "/etc/passwd", "/project"), null);
  assert.equal(itemOutputFile(item, "relative/chart.png", "/project"), null);
  assert.equal(itemOutputFile(null, "/out/report.pdf", "/project"), null);
  assert.equal(itemOutputFile({ id: "m", runId: "run", createdAt: at, kind: "milestone", text: "/out/report.pdf" }, "/out/report.pdf", "/project"), null);
  const review = reviewed(["docs/chart.png", "added"], ["old.png", "deleted"], ["../escape.png", "added"]);
  assert.equal(itemOutputFile(review, "docs/chart.png", "/project"), path.resolve("/project", "docs/chart.png"));
  assert.equal(itemOutputFile(review, "old.png", "/project"), null, "deleted files are not outputs");
  assert.equal(itemOutputFile(review, "../escape.png", "/project"), null, "reviewed paths never leave the checkout");
  assert.equal(itemOutputFile(review, "docs/other.png", "/project"), null);
  assert.equal(itemOutputFile(review, "docs/chart.png", ""), null);
});

test("images are bounded WebP previews at the requested size, never their original bytes", async () => {
  await withImage(3200, 1600, async (filePath) => {
    const file = await readItemOutputFile(produced(filePath), filePath, "/project", "preview");
    assert.equal(file?.kind, "image");
    const preview = file?.kind === "image" ? file.preview : null;
    assert.ok(preview);
    assert.ok(preview.dataUrl.startsWith("data:image/webp;base64,"));
    assert.deepEqual([preview.width, preview.height], [1600, 800]);
    const metadata = await sharp(Buffer.from(preview.dataUrl.split(",")[1], "base64")).metadata();
    assert.deepEqual([metadata.format, metadata.width, metadata.height], ["webp", 1600, 800]);
    const broken = path.join(path.dirname(filePath), "notes.png");
    await fs.writeFile(broken, "not an image");
    assert.equal(await readItemOutputFile(produced(broken), broken, "/project", "preview"), null);
    assert.equal(await readItemOutputFile(produced(filePath), broken, "/project", "preview"), null, "files the item did not store are never read");
    const thumbnail = await readItemOutputFile(produced(filePath), filePath, "/project", "thumbnail");
    assert.deepEqual(thumbnail?.kind === "image" && [thumbnail.preview.width, thumbnail.preview.height], [384, 192]);
    const directory = path.dirname(filePath);
    const fromReview = await readItemOutputFile(reviewed([path.basename(filePath), "modified"]), path.basename(filePath), directory, "thumbnail");
    assert.equal(fromReview?.kind, "image", "reviewed checkout images read relative to the thread's checkout");
  });
});

test("small text outputs read as text; documents, binary and large files open with the system", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "nora-tool-text-test-"));
  try {
    const csv = path.join(directory, "data.csv"); await fs.writeFile(csv, "month,value\nJan,3\n");
    const zip = path.join(directory, "bundle.zip"); await fs.writeFile(zip, Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]));
    const large = path.join(directory, "large.csv"); await fs.writeFile(large, "x".repeat(1024 * 1024 + 1));
    const pdf = path.join(directory, "report.pdf");
    const item = produced(csv, zip, large, pdf, path.join(directory, "missing.csv"));
    assert.deepEqual(await readItemOutputFile(item, csv, directory, "preview"), { kind: "text", text: "month,value\nJan,3\n" });
    assert.deepEqual(await readItemOutputFile(item, csv, directory, "thumbnail"), { kind: "unsupported" }, "thumbnails never read text");
    assert.deepEqual(await readItemOutputFile(item, zip, directory, "preview"), { kind: "unsupported" });
    assert.deepEqual(await readItemOutputFile(item, large, directory, "preview"), { kind: "unsupported" });
    assert.deepEqual(await readItemOutputFile(item, pdf, directory, "preview"), { kind: "unsupported" });
    assert.equal(await readItemOutputFile(item, path.join(directory, "missing.csv"), directory, "preview"), null);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test("the host reads and resolves only the files its stored item names", async (t) => {
  await withImage(40, 20, async (filePath) => {
    const f = fixture(t); f.create();
    const providers = new ProviderRegistry(); providers.register(new ProviderDouble());
    const host = new ExecutionHost({ store: f.store, providers, workspaces: workspaceAuthority, owner: { id: randomUUID(), processId: process.pid },
      isProcessAlive: () => true, now: () => "2026-11-18T10:00:00.000Z", nextId: randomUUID, onFailure: () => {} });
    host.start();
    try {
      f.submit();
      const turn = f.snapshot().runs[0];
      f.engine.accept({ conversationId: "conversation", runId: "run", attemptId: turn.attemptId, eventId: "output", kind: "item", item: produced(filePath) });
      const file = await host.outputFile("conversation", "output-call", filePath, "preview");
      assert.deepEqual(file?.kind === "image" && [file.preview.width, file.preview.height], [40, 20]);
      assert.equal(host.outputFilePath("conversation", "output-call", filePath), filePath);
      assert.throws(() => host.outputFilePath("conversation", "output-call", "/etc/passwd"), /not one of the thread's outputs/);
      await assert.rejects(host.outputFile("conversation", "unknown-item", filePath, "preview"), /unavailable/);
    } finally { await host.shutdown(); }
  });
});
