import assert from "node:assert/strict";
import test from "node:test";
import { createIslandRuntime } from "@main/helpers/island/islandRuntime";
import type { ActiveWorkCount, ActiveWorkItem } from "@main/types/desktop-lifecycle/desktopLifecycle.types";
import type { IslandDisplay, IslandPlacement, IslandRuntimeDeps } from "@main/types/island/island.types";
import type { IslandTarget, IslandView, NotchIslandSettings } from "@shared/types/island/island.types";

const notched: IslandDisplay = { id: 1, internal: true, bounds: { x: 0, y: 0, width: 1512, height: 982 }, workArea: { x: 0, y: 32, width: 1512, height: 950 } };
const external: IslandDisplay = { id: 2, internal: false, bounds: { x: 1512, y: 0, width: 2560, height: 1440 }, workArea: { x: 1512, y: 25, width: 2560, height: 1415 } };
const running: ActiveWorkItem = { kind: "thread", title: "Fix tests", workspace: "/work/nora", status: "Running", phase: "running",
  identity: { kind: "provider", toolId: "codex", label: "Codex", connection: "unknown" }, activeAt: "2026-11-27T10:00:00Z",
  target: { kind: "thread", conversationId: "c1" } };
const asWork = (items: ActiveWorkItem[]): ActiveWorkCount => ({ items, conversations: items.length, agents: 0, total: items.length });
const flush = () => new Promise((resolve) => setTimeout(resolve, 5));

interface FakeWindow { id: number; placement: IslandPlacement; views: IslandView[]; interactive: boolean[]; destroyed: boolean; }

function harness(overrides: Partial<IslandRuntimeDeps> = {}) {
  const f = {
    displays: [notched, external] as IslandDisplay[],
    work: asWork([]),
    settings: { enabled: true, alwaysShow: false, size: "notch" } as NotchIslandSettings,
    windows: [] as FakeWindow[],
    opened: [] as IslandTarget[],
    onWork: null as (() => void) | null,
    onDisplays: null as (() => void) | null,
    stoppedWatching: false
  };
  const runtime = createIslandRuntime({
    supported: true,
    settings: () => f.settings,
    countActiveWork: () => f.work,
    screen: { getAllDisplays: () => f.displays, onDisplaysChanged: (listener) => { f.onDisplays = listener; return () => { f.onDisplays = null; }; } },
    createWindow: (placement) => {
      const window: FakeWindow = { id: 100 + f.windows.length, placement, views: [], interactive: [], destroyed: false };
      f.windows.push(window);
      return { webContentsId: window.id, setBounds: (bounds) => { window.placement = { ...window.placement, bounds }; },
        showView: (view) => window.views.push(view), setInteractive: (value) => window.interactive.push(value),
        destroy: () => { window.destroyed = true; } };
    },
    open: (target) => f.opened.push(target),
    openInbox: () => undefined,
    openNora: () => undefined,
    watchWork: (onChange) => { f.onWork = onChange; return () => { f.stoppedWatching = true; }; },
    log: () => undefined,
    refreshDelayMs: 1,
    demoDurationMs: 30,
    ...overrides
  });
  return { f, runtime, live: () => f.windows.filter((window) => !window.destroyed) };
}

test("an island opens on the notched display only while work is active, and closes when it ends", async () => {
  const { f, runtime, live } = harness();
  await flush();
  assert.equal(f.windows.length, 0);
  f.work = asWork([running]); f.onWork?.(); await flush();
  assert.deepEqual(live().map((window) => window.placement.displayId), [1]);
  assert.equal(live()[0]?.views.at(-1)?.state.counts.running, 1);
  assert.ok(f.onDisplays, "displays are watched while the island shows");
  f.work = asWork([]); f.onWork?.(); await flush();
  assert.equal(live().length, 0);
  assert.equal(f.onDisplays, null);
  runtime.dispose();
  assert.equal(f.stoppedWatching, true);
});

test("unchanged work does not resend the view; changed work does", async () => {
  const { f, live } = harness();
  f.work = asWork([running]); f.onWork?.(); await flush();
  f.onWork?.(); await flush();
  assert.equal(live()[0]?.views.length, 1);
  f.work = asWork([{ ...running, phase: "waiting", status: "Waiting for input" }]); f.onWork?.(); await flush();
  assert.equal(live()[0]?.views.at(-1)?.state.headline, "waiting");
});

test("turning the setting off removes the island at once and turning it on brings it back", async () => {
  const { f, runtime, live } = harness();
  f.work = asWork([running]); f.onWork?.(); await flush();
  f.settings = { ...f.settings, enabled: false }; runtime.settingsChanged();
  assert.equal(live().length, 0);
  f.settings = { ...f.settings, enabled: true }; runtime.settingsChanged();
  assert.equal(live().length, 1);
});

test("display changes move, add or remove island windows", async () => {
  const { f, live } = harness();
  f.work = asWork([running]); f.onWork?.(); await flush();
  f.displays = [{ ...notched, bounds: { ...notched.bounds, width: 1710, height: 1107 } }];
  f.onDisplays?.();
  assert.equal(live().length, 1);
  assert.equal(live()[0]?.views.at(-1)?.geometry.notchWidth, 209);
  f.displays = [external];
  f.onDisplays?.();
  assert.equal(live().length, 0);
});

test("only island windows are trusted senders, and their pointer state reaches the right window", async () => {
  const { f, runtime, live } = harness();
  f.work = asWork([running]); f.onWork?.(); await flush();
  const window = live()[0];
  assert.ok(window);
  assert.equal(runtime.ownsSender(window.id), true);
  assert.equal(runtime.ownsSender(1), false);
  runtime.setInteractive(window.id, true);
  assert.deepEqual(window.interactive, [true]);
  runtime.open({ kind: "thread", conversationId: "c1" });
  assert.deepEqual(f.opened, [{ kind: "thread", conversationId: "c1" }]);
});

test("unsupported platforms never watch work or open windows", async () => {
  const { f } = harness({ supported: false });
  f.work = asWork([running]);
  await flush();
  assert.equal(f.onWork, null);
  assert.equal(f.windows.length, 0);
});

test("a failure to read work hides the island instead of throwing", async () => {
  const { f, live } = harness({ countActiveWork: () => { throw new Error("runtime not ready"); } });
  f.onWork?.(); await flush();
  assert.equal(live().length, 0);
});

test("a demo shows sample work even with the setting off, opens Nora instead of fake threads, then ends", async () => {
  const { f, runtime, live } = harness();
  f.settings = { enabled: false, alwaysShow: false, size: "large" };
  assert.equal(runtime.startDemo("needs-you"), "shown");
  assert.equal(live()[0]?.views.at(-1)?.size, "large", "the demo previews the chosen size");
  assert.equal(live().length, 1);
  const state = live()[0]?.views.at(-1)?.state;
  assert.deepEqual(state?.counts, { waiting: 1, running: 2, queued: 1, total: 4 });
  assert.ok(state?.items.some((item) => item.identity.kind === "bot"));
  assert.equal(state?.items[0]?.title, "Review the release notes", "the waiting demo thread leads");
  let openedNora = 0;
  const demo = harness({ openNora: () => { openedNora += 1; } });
  demo.runtime.startDemo("running");
  demo.runtime.open({ kind: "thread", conversationId: "island-demo-tests" });
  assert.equal(openedNora, 1);
  assert.deepEqual(demo.f.opened, []);
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(live().length, 0, "the island leaves once the demo ends and no real work is active");
  runtime.dispose(); demo.runtime.dispose();
});

test("a demo reports why it cannot show", () => {
  assert.equal(harness({ supported: false }).runtime.startDemo("running"), "unsupported");
  const { f, runtime } = harness();
  f.displays = [external];
  assert.equal(runtime.startDemo("running"), "no-notch");
  runtime.dispose();
});

test("always show keeps an idle island up, and a size change resends the view", async () => {
  const { f, runtime, live } = harness();
  f.settings = { enabled: true, alwaysShow: true, size: "notch" }; runtime.settingsChanged();
  assert.equal(live().length, 1);
  assert.equal(live()[0]?.views.at(-1)?.state.counts.total, 0);
  f.settings = { ...f.settings, size: "medium" }; runtime.settingsChanged();
  assert.equal(live()[0]?.views.at(-1)?.size, "medium");
  f.settings = { ...f.settings, alwaysShow: false }; runtime.settingsChanged();
  assert.equal(live().length, 0);
  runtime.dispose();
});

test("the running demo has nothing waiting, so a running thread leads; needs-you leads with the waiting one", () => {
  const { runtime, live } = harness();
  runtime.startDemo("running");
  const running = live()[0]?.views.at(-1)?.state;
  assert.equal(running?.counts.waiting, 0);
  assert.equal(running?.headline, "running");
  assert.equal(running?.items[0]?.title, "Fix the flaky sync tests");
  runtime.startDemo("needs-you");
  assert.equal(live()[0]?.views.at(-1)?.state.headline, "waiting");
  runtime.dispose();
});

test("stopping a demo returns the island to real work at once", async () => {
  const { f, runtime, live } = harness();
  runtime.startDemo("running");
  assert.equal(live().length, 1);
  runtime.stopDemo();
  assert.equal(live().length, 0, "nothing real is running, so the island hides");
  f.work = asWork([running]); runtime.startDemo("needs-you"); runtime.stopDemo();
  assert.equal(live()[0]?.views.at(-1)?.state.items[0]?.title, "Fix tests");
  runtime.stopDemo();
  runtime.dispose();
});
