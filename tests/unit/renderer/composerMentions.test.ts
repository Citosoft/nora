import assert from "node:assert/strict";
import test from "node:test";
import { activeMention, insertMention, matchMentions } from "@/components/app/logic/composerMentions";

const options = ["Ada", "Release Bot", "Rex", "Madam"].map((name) => ({ id: name, name, icon: null }));

test("an @ starts a mention only at a word boundary, and line breaks end it", () => {
  assert.deepEqual(activeMention("Hey @Ad", 7), { start: 4, query: "Ad" });
  assert.deepEqual(activeMention("@", 1), { start: 0, query: "" });
  assert.deepEqual(activeMention("(@re", 4), { start: 1, query: "re" });
  assert.equal(activeMention("mail me@ada.dev", 15), null);
  assert.equal(activeMention("@Ada\nnext", 9), null);
  assert.deepEqual(activeMention("@Release B", 10), { start: 0, query: "Release B" });
  assert.equal(activeMention("@Ada hello", 1)?.query, "");
});

test("prefix matches come before contains matches, case-insensitively", () => {
  assert.deepEqual(matchMentions(options, "").map((option) => option.name), ["Ada", "Release Bot", "Rex", "Madam"]);
  assert.deepEqual(matchMentions(options, "ad").map((option) => option.name), ["Ada", "Madam"]);
  assert.deepEqual(matchMentions(options, "release b").map((option) => option.name), ["Release Bot"]);
  assert.deepEqual(matchMentions(options, "zed"), []);
});

test("inserting replaces the typed query with the full name and one space", () => {
  assert.deepEqual(insertMention("Hey @Re, thoughts?", { start: 4, query: "Re" }, 7, "Release Bot"), { text: "Hey @Release Bot , thoughts?", caret: 17 });
  assert.deepEqual(insertMention("@a then", { start: 0, query: "a" }, 2, "Ada"), { text: "@Ada then", caret: 5 });
});
