import assert from "node:assert/strict";
import test from "node:test";
import { selectQuestionOption, setOtherQuestionAnswer } from "@/components/app/logic/nativeQuestionAnswers";
import { areQuestionAnswersComplete } from "@shared/conversations/questionAnswers";
import type { RequestQuestion } from "@/components/app/types/nativeQuestions.types";
import { validateResponse } from "@main/execution/decideCommand";

const single: RequestQuestion = { id: "approach", text: "Which approach?", options: ["A", "B", "C"], multiple: false };
const multiple: RequestQuestion = { ...single, id: "targets", text: "Which targets?", multiple: true };
const freeText: RequestQuestion = { id: "details", text: "Anything else?", options: [], multiple: false };

test("single selection replaces the previous answer without mutating it", () => {
  const previous = ["A"];
  assert.deepEqual(selectQuestionOption(single, previous, "B", true), ["B"]);
  assert.deepEqual(previous, ["A"]);
});

test("multiple selections toggle independently, remain unique and follow option order", () => {
  let answers = selectQuestionOption(multiple, [], "C", true);
  answers = selectQuestionOption(multiple, answers, "A", true);
  answers = selectQuestionOption(multiple, answers, "A", true);
  assert.deepEqual(answers, ["A", "C"]);
  assert.deepEqual(selectQuestionOption(multiple, answers, "A", false), ["C"]);
  assert.deepEqual(selectQuestionOption(multiple, answers, "invalid", true), answers);
});

test("submission requires a valid answer for every question", () => {
  const questions = [single, multiple, freeText];
  const answers = { approach: ["B"], targets: ["A", "C"], details: ["Keep it simple"] };
  assert.equal(areQuestionAnswersComplete(questions, answers), true);
  assert.equal(areQuestionAnswersComplete(questions, { ...answers, targets: [] }), false);
  assert.equal(areQuestionAnswersComplete(questions, { ...answers, details: ["  "] }), false);
  assert.equal(areQuestionAnswersComplete(questions, { ...answers, approach: ["A", "B"] }), false);
  assert.equal(areQuestionAnswersComplete(questions, { ...answers, approach: ["invalid"] }), false);
  assert.equal(areQuestionAnswersComplete(questions, {}), false);
});

test("Other answers require text and coexist with multiple selections only when allowed", () => {
  const question = { ...multiple, allowOther: true };
  const pending = setOtherQuestionAnswer(question, ["B"], "");
  assert.deepEqual(pending, ["B", ""]);
  assert.equal(areQuestionAnswersComplete([question], { targets: pending }), false);
  const answers = setOtherQuestionAnswer(question, pending, "Custom answer");
  assert.deepEqual(selectQuestionOption(question, answers, "C", true), ["B", "C", "Custom answer"]);
  assert.equal(areQuestionAnswersComplete([question], { targets: answers }), true);
  assert.equal(areQuestionAnswersComplete([multiple], { targets: answers }), false);
  assert.deepEqual(setOtherQuestionAnswer({ ...single, allowOther: true }, ["B"], "Custom"), ["Custom"]);
});

test("selected answers match the execution response contract for mixed question types", () => {
  const questions = [single, multiple, freeText];
  const answers = {
    approach: selectQuestionOption(single, ["A"], "B", true),
    targets: selectQuestionOption(multiple, ["A"], "C", true),
    details: ["Include documentation"]
  };
  assert.equal(areQuestionAnswersComplete(questions, answers), true);
  assert.doesNotThrow(() => validateResponse({
    kind: "question", id: "request", nativeId: "native", runId: "run", attemptId: "attempt", title: "Choose",
    status: "pending", createdAt: "2026-11-10T10:00:00.000Z", expiresAt: "2026-11-10T11:00:00.000Z", questions
  }, { kind: "question", answers }));
});
