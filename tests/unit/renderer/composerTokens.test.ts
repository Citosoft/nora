import assert from "node:assert/strict";
import test from "node:test";
import { activeComposerToken, insertComposerToken, matchMentions } from "@/components/app/logic/composerTokens";

const options = ["Ada", "Release Bot", "Rex", "Madam"].map((name) => ({ id: name, name, icon: null }));

test("an @ starts a mention only at a word boundary, and line breaks end it", () => {
  assert.deepEqual(activeComposerToken("Hey @Ad", 7, "@"), { trigger: "@", start: 4, query: "Ad" });
  assert.deepEqual(activeComposerToken("@", 1, "@"), { trigger: "@", start: 0, query: "" });
  assert.deepEqual(activeComposerToken("(@re", 4, "@"), { trigger: "@", start: 1, query: "re" });
  assert.equal(activeComposerToken("mail me@ada.dev", 15, "@"), null);
  assert.equal(activeComposerToken("@Ada\nnext", 9, "@"), null);
  assert.deepEqual(activeComposerToken("@Release B", 10, "@"), { trigger: "@", start: 0, query: "Release B" });
  assert.equal(activeComposerToken("@Ada hello", 1, "@")?.query, "");
});

test("prefix matches come before contains matches, case-insensitively", () => {
  assert.deepEqual(matchMentions(options, "").map((option) => option.name), ["Ada", "Release Bot", "Rex", "Madam"]);
  assert.deepEqual(matchMentions(options, "ad").map((option) => option.name), ["Ada", "Madam"]);
  assert.deepEqual(matchMentions(options, "release b").map((option) => option.name), ["Release Bot"]);
  assert.deepEqual(matchMentions(options, "zed"), []);
});

test("inserting replaces the typed query with the full name and one space", () => {
  assert.deepEqual(insertComposerToken("Hey @Re, thoughts?", { start: 4, query: "Re" }, 7, "@Release Bot"), { text: "Hey @Release Bot , thoughts?", caret: 17 });
  assert.deepEqual(insertComposerToken("@a then", { start: 0, query: "a" }, 2, "@Ada"), { text: "@Ada then", caret: 5 });
});
