import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, readFile, rename, symlink, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openWorkspaceCatalog } from "@main/personalization/workspaceCatalog";
import { LocalWorkspaceAuthority } from "@main/execution/localWorkspace";
import type { WorkspaceCatalog } from "@main/types/personalization/services.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";

test("Personal provision is concurrent-idempotent, persisted, folder-backed and identity checked", async (t) => {
  const temp = await mkdtemp(join(tmpdir(), "nora-personal-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const personalPath = join(temp, "personal"), indexPath = join(temp, "state", "workspaces.json");
  const inspectCheckout = async (path: string) => ({ rootPath: path, branch: "", versionControl: "none" as const });
  let catalog: WorkspaceCatalog | undefined;
  const authority = new LocalWorkspaceAuthority({ environmentId: "local", registrations: () => catalog?.registrations() ?? [], inspectCheckout });
  const options = { indexPath, personalPath, environmentId: "local", authority,
    prepare: (selection: WorkspaceRef) => new LocalWorkspaceAuthority({ environmentId: "local", registrations: () => [{ projectId: selection.projectId, checkoutId: selection.checkoutId, path: selection.path }], inspectCheckout }).prepare(selection) };
  catalog = await openWorkspaceCatalog(options);
  const results = await Promise.all([catalog.ensurePersonal(), catalog.ensurePersonal(), catalog.ensurePersonal()]);
  assert.equal(new Set(results.map((entry) => entry.id)).size, 1);
  assert.equal(catalog.list().length, 1);
  assert.equal(results[0].workspace.branch, "");
  assert.equal(results[0].workspace.path, await realpath(personalPath));
  catalog = await openWorkspaceCatalog(options);
  assert.deepEqual(await catalog.ensurePersonal(), results[0]);
  assert.equal(JSON.parse(await readFile(indexPath, "utf8")).workspaces.length, 1);
  await rename(personalPath, `${personalPath}-old`); await mkdir(personalPath);
  await assert.rejects(catalog.ensurePersonal(), /identity or branch changed/);
  assert.equal(catalog.list().length, 1);
});

test("Personal refuses symlink redirection and registry corruption instead of replacing data", async (t) => {
  const temp = await mkdtemp(join(tmpdir(), "nora-personal-unsafe-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const actual = join(temp, "actual"), personalPath = join(temp, "personal"); await mkdir(actual); await symlink(actual, personalPath);
  const catalog = await openWorkspaceCatalog({ personalPath, indexPath: join(temp, "index.json"), environmentId: "local", authority: { async verify() {} },
    async prepare(selection) { return selection; } });
  await assert.rejects(catalog.ensurePersonal(), /regular directory/);
  assert.equal(catalog.list().length, 0);
});

test("rebinding a workspace after a branch switch refreshes the catalog but preserves conversation checks", async (t) => {
  const temp = await mkdtemp(join(tmpdir(), "nora-workspace-branch-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const projectPath = join(temp, "project");
  await mkdir(projectPath);
  let branch = "main";
  const inspectCheckout = async (path: string) => ({ rootPath: path, branch, versionControl: "git" as const });
  let catalog: WorkspaceCatalog | undefined;
  const authority = new LocalWorkspaceAuthority({ environmentId: "local", registrations: () => catalog?.registrations() ?? [], inspectCheckout });
  const options = {
    indexPath: join(temp, "index.json"), personalPath: join(temp, "personal"), environmentId: "local", authority,
    prepare: (selection: WorkspaceRef) => new LocalWorkspaceAuthority({ environmentId: "local", inspectCheckout,
      registrations: () => [{ projectId: selection.projectId, checkoutId: selection.checkoutId, path: selection.path }] }).prepare(selection)
  };
  catalog = await openWorkspaceCatalog(options);
  const original = await catalog.bindProject("shell-project", projectPath, "Project");
  branch = "feature";

  catalog = await openWorkspaceCatalog(options);
  const refreshed = await catalog.bindProject("shell-project", projectPath, "Project");
  assert.equal(refreshed.id, original.id);
  assert.equal(refreshed.workspace.checkoutId, original.workspace.checkoutId);
  assert.equal(refreshed.workspace.branch, "feature");
  assert.equal(refreshed.shellProjectId, "shell-project");
  assert.deepEqual((await openWorkspaceCatalog(options)).list(), [refreshed]);
  await assert.rejects(authority.verify(original.workspace), /identity or branch changed/);
  await authority.verify(refreshed.workspace);

  // Refreshing a branch must never admit a directory replacement at the same path.
  await rename(projectPath, `${projectPath}-old`);
  await mkdir(projectPath);
  await assert.rejects(catalog.bindProject("shell-project", projectPath, "Project"), /identity or branch changed/);
  assert.deepEqual(catalog.list(), [refreshed]);
});
