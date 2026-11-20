import assert from "node:assert/strict";
import test from "node:test";
import { buildTaskLink, parseTaskLink, taskMarkdownLink } from "@shared/taskLink";
import { taskIdFromPath } from "@shared/taskIdentity";

test("task links preserve project and stable task identity, including encoded characters", () => {
  const link = buildTaskLink("project & one", "folder/task #1?(draft)");
  assert.ok(!/[()\s]/.test(link));
  assert.deepEqual(parseTaskLink(link), { projectId: "project & one", taskId: "folder/task #1?(draft)" });
  assert.equal(buildTaskLink("project", taskIdFromPath(".nora/tasks/release.md")),
    buildTaskLink("project", taskIdFromPath(".nora/tasks/completed/release.md")));
});

test("task link parser rejects unrelated schemes and malformed targets", () => {
  for (const href of ["https://tasks/open?projectId=p&taskId=t", "javascript:alert(1)",
    "nora://tasks/open?projectId=p", "nora://tasks/open?projectId=p&taskId=", "nora://tasks/open?projectId=p&taskId=t#hash",
    "nora://user@tasks/open?projectId=p&taskId=t", "nora://tasks/open?projectId=p&taskId=t&extra=1",
    "nora://tasks/open?taskId=t&taskId=other", "nora://tasks/delete?projectId=p&taskId=t"]) {
    assert.equal(parseTaskLink(href), null, href);
  }
});

test("task link labels escape Markdown supplied in task titles", () => {
  assert.equal(taskMarkdownLink("Ship [v2] *now* <please>\nnext", "nora://tasks/open?projectId=p&taskId=t"),
    "[Ship \\[v2\\] \\*now\\* \\<please\\> next](nora://tasks/open?projectId=p&taskId=t)");
});
