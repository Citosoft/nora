import { parseStoredProjectSummaries, parseStoredProjectSummary } from "@main/helpers/storedProjectSummary";
import { isGitProject } from "@shared/projectVersionControl";
import assert from "node:assert/strict";
import test from "node:test";

const legacyProject = {
  id: "legacy-1",
  name: "legacy",
  rootPath: "/repo/legacy",
  gitCommonDir: "/repo/legacy/.git",
  baseBranch: "main",
  framework: null,
  platform: "darwin",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  lastOpenedAt: "2026-01-01T00:00:00.000Z"
};

test("parseStoredProjectSummary defaults projects saved before version control detection to git", () => {
  const project = parseStoredProjectSummary(legacyProject);

  assert.equal(project?.versionControl, "git");
  assert.equal(isGitProject(project), true);
});

test("parseStoredProjectSummary keeps plain-folder projects and drops malformed entries", () => {
  const projects = parseStoredProjectSummaries([
    { ...legacyProject, id: "plain-1", versionControl: "none", gitCommonDir: "", baseBranch: "" },
    { id: "broken" }
  ]);

  assert.deepEqual(projects.map((project) => [project.id, project.versionControl]), [["plain-1", "none"]]);
});

test("isGitProject only disables git for an explicit none", () => {
  assert.equal(isGitProject({}), true);
  assert.equal(isGitProject(null), true);
  assert.equal(isGitProject({ versionControl: "git" }), true);
  assert.equal(isGitProject({ versionControl: "none" }), false);
});
