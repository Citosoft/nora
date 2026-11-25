import assert from "node:assert/strict";
import test from "node:test";
import { ancestorConversationIds, onlyAncestorWriters } from "@main/execution/ancestorWriters";
import type { ConversationHeader } from "@shared/types/conversation/queries.types";

const header = (parents: Record<string, string | null>): ((id: string) => ConversationHeader | null) => (id) =>
  Object.prototype.hasOwnProperty.call(parents, id)
    ? { conversation: { parentId: parents[id] } } as ConversationHeader
    : null;

test("ancestorConversationIds walks parentId to the root without looping", () => {
  const lookup = header({ child: "parent", parent: "root", root: null });
  assert.deepEqual([...ancestorConversationIds(lookup, "child")], ["parent", "root"]);
  assert.deepEqual([...ancestorConversationIds(lookup, "root")], []);
});

test("onlyAncestorWriters allows a parent waiting on its child and rejects siblings", () => {
  const lookup = header({ "child-a": "parent", "child-b": "parent", parent: null });
  assert.equal(onlyAncestorWriters(lookup, "child-a", ["parent"]), true);
  assert.equal(onlyAncestorWriters(lookup, "child-a", ["parent", "child-b"]), false);
  assert.equal(onlyAncestorWriters(lookup, "parent", ["child-a"]), false);
  assert.equal(onlyAncestorWriters(lookup, "child-a", []), true);
});
