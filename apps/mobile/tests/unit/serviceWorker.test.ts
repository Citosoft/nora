import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

type Listener = (event: FakeEvent) => void;
interface FakeEvent {
  request?: { method: string; url: string; mode: string };
  respondWith?: (response: Promise<unknown>) => void;
  waitUntil?: (promise: Promise<unknown>) => void;
}

const source = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8")
  .replace(/\/\* NORA_BUILD_START \*\/[\s\S]*?\/\* NORA_BUILD_END \*\//, '/* NORA_BUILD_START */ {"id":"build2","shell":["/","/index.html","/_expo/static/js/web/[id]-abc.js"]} /* NORA_BUILD_END */');

type FakeResponse = { ok: boolean; status: number; headers: { get: (name: string) => string | null } };
const respond = (contentType: string, status = 200): FakeResponse => ({ ok: status < 400, status, headers: { get: () => contentType } });
/** What the host serves for each shell path: the real files by default. */
const realFiles = (url: string): FakeResponse => respond(url.endsWith(".js") ? "text/javascript" : "text/html");

function loadWorker(existingCaches: string[], serve: (url: string) => FakeResponse = realFiles) {
  const listeners = new Map<string, Listener>();
  const deleted: string[] = [];
  const added: string[] = [];
  let skipped = false;
  const self = {
    location: { origin: "https://app.withnora.run" },
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
    skipWaiting: async () => { skipped = true; },
    clients: { claim: async () => undefined }
  };
  const caches = {
    open: async () => ({ put: async (url: string) => { added.push(url); } }),
    keys: async () => existingCaches,
    delete: async (key: string) => { deleted.push(key); return true; },
    match: async () => undefined
  };
  runInNewContext(source, { self, caches, fetch: async (input: string | { url: string }) => serve(typeof input === "string" ? input : input.url), URL, Response: { error: () => "error" }, Promise, Set });
  const dispatch = async (type: string, event: FakeEvent): Promise<void> => {
    const listener = listeners.get(type);
    if (!listener) throw new Error(`no ${type} listener`);
    const pending: Promise<unknown>[] = [];
    listener({ ...event, waitUntil: (promise) => pending.push(promise) });
    await Promise.all(pending);
  };
  const fetchResponds = (url: string, mode = "cors", method = "GET"): boolean => {
    let responded = false;
    listeners.get("fetch")?.({ request: { method, url, mode }, respondWith: () => { responded = true; } });
    return responded;
  };
  return { dispatch, fetchResponds, deleted, added, skipped: () => skipped };
}

describe("service worker", () => {
  it("precaches the stamped shell, skips waiting and deletes older shell caches only", async () => {
    const worker = loadWorker(["nora-shell-build1", "nora-shell-build2", "other-app"]);
    await worker.dispatch("install", {});
    expect(worker.added).toEqual(["/", "/index.html", "/_expo/static/js/web/[id]-abc.js"]);
    expect(worker.skipped()).toBe(true);
    await worker.dispatch("activate", {});
    expect(worker.deleted).toEqual(["nora-shell-build1"]);
  });

  it("refuses to install when a bundle comes back as the app's HTML page, caching nothing", async () => {
    // Regression: right after a deploy the host briefly answered new bundles with index.html (200), which got cached as
    // the JavaScript and left the app blank until the next build.
    const worker = loadWorker([], () => respond("text/html"));
    await expect(worker.dispatch("install", {})).rejects.toThrow(/text\/html/);
    expect(worker.added).toEqual([]);
    expect(worker.skipped()).toBe(false);
  });

  it("refuses to install when a shell file fails to load", async () => {
    const worker = loadWorker([], (url) => (url.endsWith(".js") ? respond("text/plain", 404) : realFiles(url)));
    await expect(worker.dispatch("install", {})).rejects.toThrow(/404/);
    expect(worker.added).toEqual([]);
  });

  it("never handles cross-origin, API or non-GET requests", () => {
    const worker = loadWorker([]);
    expect(worker.fetchResponds("https://abc.remote.withnora.run/v1/conversations")).toBe(false);
    expect(worker.fetchResponds("https://remote-api.withnora.run/v1/runtimes")).toBe(false);
    expect(worker.fetchResponds("https://clerk.withnora.run/v1/client")).toBe(false);
    expect(worker.fetchResponds("https://app.withnora.run/metadata.json")).toBe(false);
    expect(worker.fetchResponds("https://app.withnora.run/index.html", "cors", "POST")).toBe(false);
  });

  it("serves shell assets and navigations (network first) only", () => {
    const worker = loadWorker([]);
    expect(worker.fetchResponds("https://app.withnora.run/_expo/static/js/web/[id]-abc.js")).toBe(true);
    expect(worker.fetchResponds("https://app.withnora.run/runtimes/abc", "navigate")).toBe(true);
  });
});
