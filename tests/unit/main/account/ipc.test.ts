import assert from "node:assert/strict";
import { test } from "node:test";
import type { IpcMainInvokeEvent } from "electron";
import { registerAccountIpc } from "@main/ipc/registerAccountIpc";
import { ACCOUNT_CHANNELS } from "@shared/account/contracts";
import type { AccountRuntime } from "@main/types/account/runtime.types";
import type { AccountState } from "@shared/types/account/account.types";

test("only the trusted main frame can open dialogs and report account identity", () => {
  // Opaque event identities: handlers delegate window validation to the injected predicates.
  const workspaceEvent = {} as IpcMainInvokeEvent;
  const foreignEvent = {} as IpcMainInvokeEvent;
  const handlers = new Map<string, (event: IpcMainInvokeEvent, input: unknown) => unknown>();
  let state: AccountState = { status: "signed-out" };
  let opens = 0;
  const runtime: AccountRuntime = {
    initialize() {}, async load() {}, open() { opens++; }, state: () => state,
    config: () => ({ publishableKey: "pk_test_example" }), publish(next) { state = next; },
    isAccountSender: (event) => event === workspaceEvent, dispose() {},
    session: () => null, cloud: { read: async () => null, write: async () => ({ version: 1, entries: {} }) }
  };
  const dispose = registerAccountIpc({ runtime, isAllowedSender: (event) => event === workspaceEvent,
    ipc: { handle(channel, handler) { handlers.set(channel, handler); }, removeHandler(channel) { handlers.delete(channel); } } });
  const invoke = (channel: string, event: IpcMainInvokeEvent, input?: AccountState) => {
    const handler = handlers.get(channel);
    assert.ok(handler);
    return handler(event, channel === ACCOUNT_CHANNELS.publish ? { state: input } : input);
  };
  assert.throws(() => invoke(ACCOUNT_CHANNELS.open, foreignEvent));
  assert.throws(() => invoke(ACCOUNT_CHANNELS.read, foreignEvent));
  assert.throws(() => invoke(ACCOUNT_CHANNELS.config, foreignEvent));
  assert.throws(() => invoke(ACCOUNT_CHANNELS.publish, foreignEvent, { status: "signed-in", user: { id: "forged", name: "Forged", imageUrl: null } }));
  invoke(ACCOUNT_CHANNELS.open, workspaceEvent);
  assert.equal(opens, 1);
  assert.deepEqual(invoke(ACCOUNT_CHANNELS.config, workspaceEvent), { publishableKey: "pk_test_example" });
  invoke(ACCOUNT_CHANNELS.publish, workspaceEvent, { status: "signed-in", user: { id: "user_1", name: "Daniel", imageUrl: null } });
  assert.deepEqual(invoke(ACCOUNT_CHANNELS.read, workspaceEvent), { status: "signed-in", user: { id: "user_1", name: "Daniel", imageUrl: null } });
  assert.throws(() => invoke(ACCOUNT_CHANNELS.publish, workspaceEvent, { status: "error", message: "" }));
  dispose();
  assert.equal(handlers.size, 0);
});
