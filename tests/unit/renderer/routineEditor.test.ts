import assert from "node:assert/strict";
import test from "node:test";
import { routineInputSchema } from "@shared/bots/routines/contracts";
import { validateRoutineSchedule } from "@shared/bots/routines/schedule";
import { ROUTINE_TEMPLATES } from "@shared/bots/routines/templates";
import { applyRoutineTemplate, newRoutineDraft, routineDraft, routineInputFromDraft } from "@/components/app/logic/routineEditor";
import { routineEditorSteps, routineStepReachable } from "@/components/app/logic/routineEditorSteps";

const now = new Date("2026-11-15T12:00:00.000Z");

test("every routine template saves as a valid routine", () => {
  for (const template of ROUTINE_TEMPLATES) {
    const draft = applyRoutineTemplate({ ...newRoutineDraft("app", now), timezone: "Europe/London" }, template);
    const input = routineInputFromDraft(draft, "ada", now);
    assert.ok(routineInputSchema.safeParse(input).success, template.id);
    assert.doesNotThrow(() => validateRoutineSchedule(input.schedule, input.timezone), template.id);
    assert.equal(input.workspaceId, "app");
  }
});

test("a one-off template keeps the draft's future date instead of its placeholder", () => {
  const once = ROUTINE_TEMPLATES.find((template) => template.schedule.kind === "once");
  assert.ok(once);
  const draft = applyRoutineTemplate(newRoutineDraft("app", now), once);
  assert.equal(draft.kind, "once");
  assert.notEqual(draft.date, "2026-01-01");
  assert.equal(routineInputFromDraft(draft, "ada", now).missedPolicy, "run-once");
});

test("editing an interval routine keeps its anchor, and a new interval starts now", () => {
  const draft = { ...newRoutineDraft("app", now), kind: "interval" as const, amount: 2, unit: "hours" as const };
  assert.deepEqual(routineInputFromDraft(draft, "ada", now).schedule, { kind: "interval", amount: 2, unit: "hours", anchorAt: now.toISOString() });
  const saved = { ...routineInputFromDraft(draft, "ada", now), id: "r1", nextRunAt: null, threadId: null, createdAt: now.toISOString(), updatedAt: now.toISOString(),
    schedule: { kind: "interval" as const, amount: 2, unit: "hours" as const, anchorAt: "2026-11-01T10:00:00.000Z" } };
  const later = new Date("2026-11-20T00:00:00.000Z");
  assert.deepEqual(routineInputFromDraft(routineDraft(saved, later), "ada", later).schedule, saved.schedule);
});

test("the editor's steps summarise the draft and open only once earlier steps are complete", () => {
  const workspaces = [{ id: "app", name: "App" }] as unknown as Parameters<typeof routineEditorSteps>[3];
  const blank = newRoutineDraft("app", now);
  const fresh = routineEditorSteps(true, blank, null, workspaces);
  assert.deepEqual(fresh.map((step) => [step.id, step.complete]), [["template", true], ["task", false], ["schedule", true], ["delivery", true]]);
  assert.equal(routineStepReachable(fresh, "task"), true);
  assert.equal(routineStepReachable(fresh, "schedule"), false, "the schedule waits for a name and task");

  const template = ROUTINE_TEMPLATES[0];
  const filled = routineEditorSteps(true, applyRoutineTemplate(blank, template), template.id, workspaces);
  assert.equal(filled.every((step) => step.complete), true);
  assert.deepEqual(filled.map((step) => step.summary), [template.name, template.name, "Weekdays at 08:30", "App · Chat"]);
  assert.equal(routineStepReachable(filled, "delivery"), true);

  const editing = routineEditorSteps(false, { ...blank, kind: "custom", expression: " " }, null, workspaces);
  assert.deepEqual(editing.map((step) => step.id), ["task", "schedule", "delivery"]);
  assert.equal(editing[1].complete, false);
});
