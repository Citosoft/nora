import { md5HexOfFile, md5HexOfUtf8String } from "@main/orchestrator/fileContentMd5";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("md5HexOfUtf8String matches known digest", () => {
  assert.equal(md5HexOfUtf8String("hello"), "5d41402abc4b2a76b9719d911017c592");
  assert.equal(md5HexOfUtf8String(""), "d41d8cd98f00b204e9800998ecf8427e");
});

test("md5HexOfFile hashes file bytes", async () => {
  const tmp = path.join(os.tmpdir(), `nora-md5-${Date.now()}.txt`);
  await fs.writeFile(tmp, "hello", "utf8");
  assert.equal(await md5HexOfFile(tmp), "5d41402abc4b2a76b9719d911017c592");
  await fs.unlink(tmp).catch(() => {});
});
