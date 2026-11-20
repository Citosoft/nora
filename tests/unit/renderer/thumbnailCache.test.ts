import assert from "node:assert/strict";
import test from "node:test";
import { createThumbnailCache } from "@/components/app/logic/library/thumbnailCache";

const preview = (key: string) => ({ dataUrl: `data:image/webp;base64,${key}`, width: 1, height: 1 });

test("thumbnails load once per key, forget failures and drop the oldest past the limit", async () => {
  const loads: string[] = [];
  let fail = true;
  const cache = createThumbnailCache(async (key) => {
    loads.push(key);
    if (key === "flaky" && fail) { fail = false; throw new Error("busy"); }
    return preview(key);
  }, 2);
  assert.deepEqual(await Promise.all([cache.get("a"), cache.get("a")]), [preview("a"), preview("a")]);
  assert.equal(await cache.get("flaky"), null);
  assert.deepEqual(await cache.get("flaky"), preview("flaky"), "a failed load is retried on the next visit");
  await cache.get("b");
  await cache.get("a");
  assert.deepEqual(loads, ["a", "flaky", "flaky", "b", "a"], "the oldest key is evicted once the limit is passed");
});
