import assert from "node:assert/strict";
import test from "node:test";
import { deleteComposerReference, isCompletedComposerMention, moveComposerHistory, recordComposerHistory, snapComposerOffset, splitComposerContent } from "@/components/app/logic/composerContent";
import { formatIssueReference } from "@/components/app/logic/forge-items/issueReference";

const github = { provider: "github" as const, number: 42, webUrl: "https://github.com/team/repo/issues/42" };
const gitlab = { provider: "gitlab" as const, number: 7, webUrl: "https://code.example.com/group/repo/-/issues/7" };
const tag = formatIssueReference(github);

test("the editable projection turns issue references into atomic pills without changing saved text", () => {
  const value = `Fix ${tag} then verify.`;
  const parts = splitComposerContent(value);
  assert.deepEqual(parts, [{ kind: "text", source: "Fix " }, { kind: "issue", source: tag, reference: github }, { kind: "text", source: " then verify." }]);
  assert.equal(parts.map((part) => part.source).join(""), value);
});

test("both providers, repeated issues, multiline text and manually written references round-trip", () => {
  const plainLink = '[#7](https://code.example.com/group/repo/-/issues/7 "nora-issue:gitlab")';
  const value = `${tag}\n${plainLink} ${tag}`;
  const parts = splitComposerContent(value);
  assert.deepEqual(parts.filter((part) => part.kind === "issue").map((part) => part.reference), [github, gitlab, github]);
  assert.equal(parts.map((part) => part.source).join(""), value);
});

test("ordinary Markdown and malformed references stay editable plain text", () => {
  for (const value of ["Fix #42", "[link](https://example.com)", '[#43](https://github.com/team/repo/issues/42 "nora-issue:github")', '[#42](javascript:alert(1) "nora-issue:github")']) {
    assert.deepEqual(splitComposerContent(value), [{ kind: "text", source: value }]);
  }
  assert.deepEqual(splitComposerContent(""), []);
});

test("carets snap to pill edges without changing ordinary text positions", () => {
  const value = `Fix ${tag} please`;
  assert.equal(snapComposerOffset(value, 2), 2);
  assert.equal(snapComposerOffset(value, 5), 4);
  assert.equal(snapComposerOffset(value, 4 + tag.length - 1), 4 + tag.length);
  assert.equal(snapComposerOffset(value, -1), 0);
  assert.equal(snapComposerOffset(value, value.length + 1), value.length);
});

test("backspace and delete remove the entire adjacent reference and preserve surrounding words", () => {
  const value = `Fix ${tag} please`;
  assert.deepEqual(deleteComposerReference(value, 4 + tag.length, -1), { text: "Fix  please", caret: 4 });
  assert.deepEqual(deleteComposerReference(value, 4, 1), { text: "Fix  please", caret: 4 });
  assert.equal(deleteComposerReference(value, 3, -1), null);
  assert.equal(deleteComposerReference(value, 5, 1), null);
});

test("undo and redo restore reference insertion and atomic deletion without losing URLs", () => {
  let history = recordComposerHistory({ values: ["Fix #"], index: 0 }, `Fix ${tag} `);
  history = recordComposerHistory(history, "Fix  ");
  history = moveComposerHistory(history, -1);
  assert.equal(history.values[history.index], `Fix ${tag} `);
  history = moveComposerHistory(history, -1);
  assert.equal(history.values[history.index], "Fix #");
  history = moveComposerHistory(history, 1);
  assert.equal(history.values[history.index], `Fix ${tag} `);
  history = recordComposerHistory(history, "New instruction");
  assert.equal(moveComposerHistory(history, 1).index, history.index);
  assert.equal(history.values.at(-1), "New instruction");
});

const mentions = [
  { id: "ada", name: "Ada", icon: null },
  { id: "release", name: "Release", icon: null },
  { id: "release-bot", name: "Release Bot", icon: null }
];

test("known mentions project as avatar pills while preserving their original routing text", () => {
  const value = "Ask @Ada and @Release Bot, please.";
  const parts = splitComposerContent(value, mentions);
  assert.deepEqual(parts.filter((part) => part.kind === "mention").map((part) => ({ source: part.source, id: part.mention.id })), [
    { source: "@Ada", id: "ada" }, { source: "@Release Bot", id: "release-bot" }
  ]);
  assert.equal(parts.map((part) => part.source).join(""), value);
});

test("partial names, unknown bots and email addresses remain ordinary text", () => {
  for (const value of ["Ask @Ad", "Ask @Missing", "mail@Ada", "Ask @Adaline", "Ask @Ada_dev"]) {
    assert.deepEqual(splitComposerContent(value, mentions), [{ kind: "text", source: value }]);
  }
  const parts = splitComposerContent("(@ada).", mentions);
  const mention = parts.find((part) => part.kind === "mention");
  assert.equal(mention?.source, "@ada");
  assert.equal(mention?.kind === "mention" ? mention.mention.name : null, "Ada");
});

test("bot mentions and issue references share atomic editing without changing either payload", () => {
  const value = `@Ada fix ${tag}`;
  const parts = splitComposerContent(value, mentions);
  assert.deepEqual(parts.map((part) => part.kind), ["mention", "text", "issue"]);
  assert.equal(parts.map((part) => part.source).join(""), value);
  assert.equal(snapComposerOffset(value, 1, mentions), 0);
  assert.equal(snapComposerOffset(value, 3, mentions), 4);
  assert.deepEqual(deleteComposerReference(value, 4, -1, mentions), { text: ` fix ${tag}`, caret: 0 });
  assert.deepEqual(deleteComposerReference(value, 0, 1, mentions), { text: ` fix ${tag}`, caret: 0 });
  assert.deepEqual(deleteComposerReference(value, value.length, -1, mentions), { text: "@Ada fix ", caret: 9 });
});

test("completed mentions stop suggestions after their separating space but fresh mentions still open", () => {
  assert.equal(isCompletedComposerMention("@Ada ", 5, 0, mentions), true);
  assert.equal(isCompletedComposerMention("@Ada", 4, 0, mentions), false);
  assert.equal(isCompletedComposerMention("@Ada @R", 7, 5, mentions), false);
  assert.equal(isCompletedComposerMention("@Release Bot check this", 23, 0, mentions), true);
});

test("undo restores removed bot pills with their original mention text", () => {
  let history = recordComposerHistory({ values: ["Ask @"], index: 0 }, "Ask @Ada ");
  history = recordComposerHistory(history, "Ask  ");
  history = moveComposerHistory(history, -1);
  const value = history.values[history.index];
  assert.equal(value, "Ask @Ada ");
  assert.equal(splitComposerContent(value, mentions).filter((part) => part.kind === "mention").length, 1);
});
