import { describe, expect, it } from "vitest";
import type { AppUpdatePort, AppUpdateSnapshot, UpdateAction } from "@/types/appUpdate.types";
import { installAppUpdate, updateScreen } from "@/state/appUpdate";

const available: AppUpdateSnapshot = { enabled: true, key: "update-1", available: true, pending: false, downloading: false, progress: undefined };
const idle: UpdateAction = { kind: "idle" };

function installer(options: { downloaded?: boolean; downloadError?: boolean; reloadError?: boolean } = {}) {
  const states: UpdateAction[] = [];
  const calls: string[] = [];
  const port: AppUpdatePort = {
    async download() { calls.push("download"); if (options.downloadError) throw new Error("offline"); return options.downloaded ?? true; },
    async reload() { calls.push("reload"); if (options.reloadError) throw new Error("cannot reload"); }
  };
  return { states, calls, port, run: (downloaded = false) => installAppUpdate(port, downloaded, (state) => states.push(state)) };
}

describe("update prompt", () => {
  it("only prompts for a known update in an enabled release app", () => {
    expect(updateScreen(available, idle, null)).toEqual({ kind: "available", downloaded: false });
    expect(updateScreen({ ...available, enabled: false }, idle, null)).toBeNull();
    expect(updateScreen({ ...available, key: null, available: false }, idle, null)).toBeNull();
  });

  it("offers a restart for updates cached during the native startup check", () => {
    expect(updateScreen({ ...available, pending: true, available: false }, idle, null)).toEqual({ kind: "available", downloaded: true });
  });

  it("dismisses the current update for this launch but prompts for a different update", () => {
    expect(updateScreen(available, idle, "update-1")).toBeNull();
    expect(updateScreen({ ...available, key: "update-2" }, idle, "update-1")).toEqual({ kind: "available", downloaded: false });
  });

  it("distinguishes background downloads from user-requested installs and bounds progress", () => {
    expect(updateScreen({ ...available, downloading: true, progress: 0.4 }, idle, null)).toEqual({ kind: "downloading", installing: false, progress: 0.4 });
    expect(updateScreen({ ...available, progress: 3 }, { kind: "downloading" }, null)).toEqual({ kind: "downloading", installing: true, progress: 1 });
    expect(updateScreen({ ...available, downloading: true, progress: Number.NaN }, idle, null)).toEqual({ kind: "downloading", installing: false, progress: null });
  });

  it("shows install and restart failures even if the availability flag has changed", () => {
    const error: UpdateAction = { kind: "error", phase: "restarting" };
    expect(updateScreen({ ...available, available: false, pending: true }, error, null)).toEqual(error);
  });
});

describe("update installation", () => {
  it("downloads before restarting and reports both phases", async () => {
    const f = installer(); await f.run();
    expect(f.calls).toEqual(["download", "reload"]);
    expect(f.states).toEqual([{ kind: "downloading" }, { kind: "restarting" }]);
  });

  it("never reloads after a failed download, and a subsequent retry can succeed", async () => {
    const f = installer({ downloadError: true }); await f.run();
    expect(f.calls).toEqual(["download"]);
    expect(f.states.at(-1)).toEqual({ kind: "error", phase: "downloading" });
    const retry = installer(); await retry.run();
    expect(retry.calls).toEqual(["download", "reload"]);
  });

  it("does not restart when the server no longer returns an update", async () => {
    const f = installer({ downloaded: false }); await f.run();
    expect(f.calls).toEqual(["download"]);
    expect(f.states.at(-1)).toEqual({ kind: "idle" });
  });

  it("reuses an already downloaded update instead of downloading it again", async () => {
    const f = installer(); await f.run(true);
    expect(f.calls).toEqual(["reload"]);
    expect(f.states).toEqual([{ kind: "restarting" }]);
  });

  it("reports restart failures so the cached update can be retried", async () => {
    const f = installer({ reloadError: true }); await f.run(true);
    expect(f.states).toEqual([{ kind: "restarting" }, { kind: "error", phase: "restarting" }]);
    const retry = installer(); await retry.run(true);
    expect(retry.calls).toEqual(["reload"]);
  });
});
