import { parseLaunchCommand } from "@main/launchCommand";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { createAppInstallRequests } from "@main/apps/installRequests";
import { directoryAppUrl, parseAppInstallLink } from "@shared/apps/installLink";
import { readDirectoryApp } from "@main/apps/readDirectoryApp";

test("install links only accept directory ids, with no arbitrary URLs or extra parameters", () => {
  assert.equal(parseAppInstallLink("nora://apps/install?id=notion-search"), "notion-search");
  for (const link of ["https://apps/install?id=foo", "nora://apps/install?id=../foo", "nora://apps/install?id=https://evil.test", "nora://apps/install?id=foo&id=bar", "nora://apps/install?id=foo&url=https://evil.test", "nora://apps/install?id=foo#bar", "nora://apps/install?id=foo%2Fbar"]) assert.equal(parseAppInstallLink(link), null, link);
  assert.equal(directoryAppUrl("notion-search"), "https://www.withnora.run/apps/files/notion-search.nora-app.json");
  assert.throws(() => directoryAppUrl("../secret"));
});

test("startup links remain pending until their own review is dismissed", () => {
  const notifications: string[] = [];
  const requests = createAppInstallRequests((id) => notifications.push(id));
  assert.equal(requests.enqueue("nora://apps/install?id=first"), true);
  assert.equal(requests.get(), "first");
  requests.enqueue("nora://apps/install?id=second");
  requests.clear("first");
  assert.equal(requests.get(), "second");
  requests.clear("second");
  assert.equal(requests.get(), null);
  assert.deepEqual(notifications, ["first", "second"]);
});

test("directory downloads reject redirects, failed responses, invalid files and oversized bodies", async () => {
  const fetchFile: typeof fetch = async (url, options) => {
    assert.equal(url, directoryAppUrl("test-app"));
    assert.equal(options?.redirect, "error");
    assert.equal(options?.credentials, "omit");
    return new Response("not JSON");
  };
  await assert.rejects(readDirectoryApp("test-app", fetchFile), /valid app file/);
  await assert.rejects(readDirectoryApp("test-app", async () => new Response("{}")), /not supported/);
  await assert.rejects(readDirectoryApp("test-app", async () => new Response("", { status: 404 })), /could not be downloaded/);
  await assert.rejects(readDirectoryApp("test-app", async () => new Response("x".repeat(2 * 1024 * 1024 + 1))), /too large/);
});


test("protocol URLs are never interpreted as project folder arguments", () => {
  assert.equal(parseLaunchCommand({ argv: ["/bin/nora", "nora://apps/install?id=test-app"], cwd: "/tmp", appRoot: "/app" }), null);
  assert.deepEqual(parseLaunchCommand({ argv: ["/bin/nora", "/tmp/project", "nora://apps/install?id=test-app"], cwd: "/tmp", appRoot: "/app" }), { projectRoot: resolve("/tmp/project"), task: null });
});
