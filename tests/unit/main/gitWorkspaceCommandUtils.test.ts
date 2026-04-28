import { mapMountedRemoteTextToLocal } from "@main/orchestrator/gitWorkspaceCommandUtils";
import type { ActiveRemoteMount } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

test("mapMountedRemoteTextToLocal rewrites remote path prefix to local mount", () => {
  const mount: ActiveRemoteMount = {
    remote: "dev:/var/www/app",
    host: "dev",
    user: "u",
    port: 22,
    localMount: "/Users/me/mnt",
    remotePath: "/var/www/app",
    alias: null
  };
  const input = "On server /var/www/app/src/index.ts line 1";
  assert.equal(mapMountedRemoteTextToLocal(input, mount), "On server /Users/me/mnt/src/index.ts line 1");
});
