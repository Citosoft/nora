import assert from "node:assert/strict";
import test from "node:test";
import { buildTrayMenu } from "@main/helpers/desktop-lifecycle/trayMenu";
import type { RemoteAccessView } from "@shared/types/remote-access/remoteAccess.types";

test("tray shows remote status and offers disable only while opted in", () => {
  assert.deepEqual(buildTrayMenu(null), [
    { kind: "action", id: "open", label: "Open Nora" }, { kind: "status", label: "Remote access: Off" },
    { kind: "separator" }, { kind: "action", id: "quit", label: "Quit Nora" }
  ]);
  const view: RemoteAccessView = { signedIn: true, enabled: true, status: { status: "connected" }, runtime: null, webAppUrl: "https://app.withnora.run", pendingCleanup: false };
  assert.deepEqual(buildTrayMenu(view)[1], { kind: "status", label: "Remote access: Connected" });
  assert.equal(buildTrayMenu(view).some((item) => item.kind === "action" && item.id === "disable-remote-access"), true);
});
