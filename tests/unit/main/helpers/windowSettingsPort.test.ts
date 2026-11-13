import assert from "node:assert/strict";
import test from "node:test";
import { createWindowSettingsPort } from "@main/helpers/windowSettingsPort";
import { registerWindowSettingsIpc } from "@main/ipc/registerWindowSettingsIpc";
import { WINDOW_SETTINGS_CHANNELS } from "@shared/nora-tools/windowSettings";
import type { WindowSettingsRequest } from "@shared/types/nora-tools/settings.types";
import type { IpcMainInvokeEvent } from "electron";
import { settingsPortsFixture } from "../nora-tools/settingsFixture";

test("window settings requests resolve only for the matching reply after application", async () => {
  const sent: WindowSettingsRequest[] = [];
  const port = createWindowSettingsPort({ send(request) { sent.push(request); } });
  const first = port.request({ appearance: { themeMode: "dark" } });
  const second = port.request({ appearance: { themeMode: "light" } });
  const f = settingsPortsFixture();
  const light = await f.windowSettings.request(sent[1].patch);
  port.receive({ id: "unrelated", status: "success", settings: light });
  port.receive({ id: sent[1].id, status: "success", settings: light });
  assert.equal((await second).appearance.themeMode, "light");
  const dark = await f.windowSettings.request(sent[0].patch);
  port.receive({ id: sent[0].id, status: "success", settings: dark });
  assert.equal((await first).appearance.themeMode, "dark");
});

test("window settings reports renderer failures, unavailable windows and timed out requests", async () => {
  let sent: WindowSettingsRequest | undefined;
  const port = createWindowSettingsPort({ send(request) { sent = request; }, timeoutMs: 10 });
  const failed = port.request({});
  assert.ok(sent);
  port.receive({ id: sent.id, status: "error", message: "storage full" });
  await assert.rejects(failed, /storage full/);
  await assert.rejects(port.request({}), /did not respond/);
  const unavailable = createWindowSettingsPort({ send() { throw new Error("window closed"); } });
  await assert.rejects(unavailable.request({}), /window closed/);
});

test("window settings IPC accepts replies only from the authorized window and validates them", async () => {
  let handle: ((event: IpcMainInvokeEvent, input: unknown) => void) | undefined;
  let received = 0;
  let allowed = false;
  registerWindowSettingsIpc({ ipc: { handle(channel, listener) {
    assert.equal(channel, WINDOW_SETTINGS_CHANNELS.reply);
    handle = listener;
  } }, port: { request: settingsPortsFixture().windowSettings.request, receive() { received += 1; } }, isAllowedSender: () => allowed });
  assert.ok(handle);
  const invoke = handle;
  const event = {} as IpcMainInvokeEvent;
  const reply = { id: "test", status: "error", message: "storage full" };
  assert.throws(() => invoke(event, reply), /cannot change app settings/);
  allowed = true;
  assert.throws(() => invoke(event, { ...reply, status: "invalid" }));
  invoke(event, reply);
  assert.equal(received, 1);
});
