import assert from "node:assert/strict";
import test from "node:test";
import { fixture } from "./fixture";

test("acceptBackgroundTasks replaces the live list on the header and clears it", (t) => {
  const f = fixture(t);
  f.create();
  assert.deepEqual(f.store.header("conversation")?.backgroundTasks, []);

  f.engine.acceptBackgroundTasks({ conversationId: "conversation", tasks: [
    { id: "task-1", description: "Wait for the build", kind: "local_bash" }
  ] });
  assert.deepEqual(f.store.header("conversation")?.backgroundTasks, [
    { id: "task-1", description: "Wait for the build", kind: "local_bash" }
  ]);
  assert.deepEqual(f.snapshot().backgroundTasks, [
    { id: "task-1", description: "Wait for the build", kind: "local_bash" }
  ]);

  f.engine.acceptBackgroundTasks({ conversationId: "conversation", tasks: [
    { id: "task-1", description: "Wait for the build", kind: "local_bash" }
  ] });
  const cursor = f.store.header("conversation")?.cursor;
  f.engine.acceptBackgroundTasks({ conversationId: "conversation", tasks: [] });
  assert.deepEqual(f.store.header("conversation")?.backgroundTasks, []);
  assert.ok((f.store.header("conversation")?.cursor ?? 0) > (cursor ?? 0));
});

test("recover clears projected background tasks left from a previous process", (t) => {
  const f = fixture(t);
  f.create();
  f.engine.acceptBackgroundTasks({ conversationId: "conversation", tasks: [{ id: "task-1", description: "Dev server" }] });
  assert.equal(f.store.header("conversation")?.backgroundTasks.length, 1);
  f.restart();
  f.engine.recover();
  assert.deepEqual(f.store.header("conversation")?.backgroundTasks, []);
});
