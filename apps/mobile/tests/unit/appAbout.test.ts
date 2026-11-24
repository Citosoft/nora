import { describe, expect, it } from "vitest";
import type { NativeAppAbout } from "@/types/appAbout.types";
import { appAboutSections, appVersionLabel, describeUpdateStatus } from "@/state/appAbout";

const info: NativeAppAbout = { kind: "native", version: "0.1.1", build: "2", applicationId: "com.citosoft.nora",
  source: "ota", updatesEnabled: true, channel: "production", runtimeVersion: "0.1.1",
  updateId: "01a205e8-b257-706a-b314-4d215cdc5101", publishedAt: new Date("2026-11-23T00:57:45Z"), lastCheckedAt: null,
  checking: false, downloading: false, available: false, pending: false, nextUpdateId: null, checkFailed: false, downloadFailed: false };

const section = (value: NativeAppAbout, title: string) => appAboutSections(value).find((entry) => entry.title === title);

describe("About app diagnostics", () => {
  it("keeps the installed binary version distinct from changing OTA identifiers", () => {
    const newer = { ...info, updateId: "01a205ff-1111-7111-b111-111111111111" };
    expect(appVersionLabel(info)).toBe("Version 0.1.1 (2)");
    expect(appVersionLabel(newer)).toBe(appVersionLabel(info));
    expect(section(newer, "Installed app")?.rows).toEqual(section(info, "Installed app")?.rows);
    expect(section(info, "Running update")?.rows).toContainEqual({ label: "Update ID", value: info.updateId });
    expect(section(newer, "Running update")?.rows).toContainEqual({ label: "Update ID", value: newer.updateId });
  });

  it("clearly identifies downloaded, embedded and recovery launches", () => {
    expect(section(info, "Running update")?.rows).toContainEqual({ label: "Running from", value: "Downloaded OTA update" });
    expect(section({ ...info, source: "embedded" }, "Running update")?.rows).toContainEqual({ label: "Running from", value: "Bundled with app" });
    expect(section({ ...info, source: "recovery" }, "Running update")?.footer).toMatch(/fell back/);
  });

  it("keeps a downloaded target separate from the code actually running", () => {
    const pending = { ...info, pending: true, nextUpdateId: "new-update-id" };
    expect(section(pending, "Running update")?.rows).toContainEqual({ label: "Update ID", value: info.updateId });
    expect(section(pending, "Downloaded update")?.rows).toEqual([{ label: "Update ID", value: "new-update-id" }]);
    expect(describeUpdateStatus(pending)).toBe("Downloaded — restart to apply");
  });

  it("does not claim to be up to date before a successful check", () => {
    expect(describeUpdateStatus(info)).toBe("Not checked this session");
    expect(describeUpdateStatus({ ...info, lastCheckedAt: new Date(), checkFailed: true })).toBe("Couldn’t check — try again");
    expect(describeUpdateStatus({ ...info, lastCheckedAt: new Date() })).toBe("Up to date");
    expect(describeUpdateStatus({ ...info, available: true })).toBe("Update available");
  });

  it("reports activity and failures without hiding a ready update behind stale errors", () => {
    expect(describeUpdateStatus({ ...info, checking: true, checkFailed: true })).toBe("Checking for updates…");
    expect(describeUpdateStatus({ ...info, downloading: true })).toBe("Downloading update…");
    expect(describeUpdateStatus({ ...info, downloadFailed: true })).toBe("Download failed — try again");
    expect(describeUpdateStatus({ ...info, pending: true, checkFailed: true })).toBe("Downloaded — restart to apply");
  });

  it("labels development and disabled builds instead of implying OTA is active", () => {
    expect(describeUpdateStatus({ ...info, source: "development", updatesEnabled: false })).toBe("Disabled in development");
    expect(describeUpdateStatus({ ...info, updatesEnabled: false })).toBe("Updates disabled");
    expect(appVersionLabel({ ...info, version: null, build: null })).toBe("Version not available");
  });

  it("does not present native OTA metadata in the web app", () => {
    const web = { kind: "web" as const, version: "0.1.1" };
    expect(appVersionLabel(web)).toBe("Version 0.1.1");
    const sections = appAboutSections(web);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.rows).toContainEqual({ label: "App type", value: "Web app" });
    expect(sections[0]?.footer).toMatch(/updates separately/);
  });
});
