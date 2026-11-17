import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, readFile, writeFile, rename, symlink, realpath } from "node:fs/promises";
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
  assert.deepEqual(await catalog.addFolder(personalPath, "Personal"), results[0]);
  assert.equal(JSON.parse(await readFile(indexPath, "utf8")).workspaces.length, 1);
  await rename(personalPath, `${personalPath}-old`); await mkdir(personalPath);
  const refreshed = await catalog.ensurePersonal();
  assert.equal(refreshed.id, results[0].id);
  assert.notEqual(refreshed.workspace.checkoutId, results[0].workspace.checkoutId);
  await assert.rejects(authority.verify(results[0].workspace), /identity or branch changed/);
  await authority.verify(refreshed.workspace);
  assert.equal(catalog.list().length, 1);
  await rm(personalPath, { recursive: true });
  await symlink(`${personalPath}-old`, personalPath);
  await assert.rejects(catalog.ensurePersonal(), /regular directory/);
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

  // Reopening a replacement refreshes the selection without rebinding old conversations.
  await rename(projectPath, `${projectPath}-old`);
  await mkdir(projectPath);
  const replacement = await catalog.bindProject("shell-project", projectPath, "Project");
  assert.equal(replacement.id, refreshed.id);
  assert.notEqual(replacement.workspace.checkoutId, refreshed.workspace.checkoutId);
  await assert.rejects(authority.verify(refreshed.workspace), /identity or branch changed/);
  await authority.verify(replacement.workspace);
});

test("startup refreshes legacy checkout IDs for Personal and repositories without changing pinned snapshots", async (t) => {
  const temp = await mkdtemp(join(tmpdir(), "nora-workspace-legacy-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const projectPath = join(temp, "project"), personalPath = join(temp, "personal"), indexPath = join(temp, "index.json");
  await mkdir(projectPath);
  const inspectCheckout = async (path: string) => ({ rootPath: path, branch: path === await realpath(projectPath) ? "main" : "",
    versionControl: path === await realpath(projectPath) ? "git" as const : "none" as const });
  let catalog: WorkspaceCatalog | undefined;
  const authority = new LocalWorkspaceAuthority({ environmentId: "local", registrations: () => catalog?.registrations() ?? [], inspectCheckout });
  const options = { indexPath, personalPath, environmentId: "local", authority,
    prepare: (selection: WorkspaceRef) => new LocalWorkspaceAuthority({ environmentId: "local", inspectCheckout,
      registrations: () => [{ projectId: selection.projectId, checkoutId: selection.checkoutId, path: selection.path }] }).prepare(selection) };
  catalog = await openWorkspaceCatalog(options);
  await catalog.ensurePersonal();
  await catalog.bindProject("shell-project", projectPath, "Project");
  const legacy = catalog.list().map((entry) => ({ ...entry, workspace: { ...entry.workspace, checkoutId: `legacy:${entry.id}` } }));
  await writeFile(indexPath, JSON.stringify({ version: 1, workspaces: legacy }));
  catalog = await openWorkspaceCatalog(options);
  await catalog.ensurePersonal();
  await catalog.bindProject("shell-project", projectPath, "Project");
  const refreshed = catalog.list();
  assert.deepEqual(refreshed.map((entry) => entry.id), legacy.map((entry) => entry.id));
  for (const entry of legacy) await assert.rejects(authority.verify(entry.workspace), /identity or branch changed/);
  for (const entry of refreshed) await authority.verify(entry.workspace);
  catalog = await openWorkspaceCatalog(options);
  await catalog.ensurePersonal();
  await catalog.bindProject("shell-project", projectPath, "Project");
  assert.deepEqual(catalog.list(), refreshed);
});

test("Personal storage saved as a plain folder by an older catalog is repaired on startup", async (t) => {
  const temp = await mkdtemp(join(tmpdir(), "nora-personal-repair-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const personalPath = join(temp, "personal"), indexPath = join(temp, "index.json");
  await mkdir(personalPath);
  const path = await realpath(personalPath);
  const stored = { id: "personal:local", name: "Personal", kind: "folder", shellProjectId: "personal-shell",
    workspace: { projectId: "personal:local", environmentId: "local", checkoutId: "registration:personal:local", path, branch: "", access: "write", versionControl: "none" } };
  await writeFile(indexPath, JSON.stringify({ version: 1, workspaces: [stored] }));
  const catalog = await openWorkspaceCatalog({ personalPath, indexPath, environmentId: "local", authority: { async verify() {} },
    async prepare(selection) { return { ...selection, versionControl: "none" }; } });
  const personal = await catalog.ensurePersonal();
  assert.equal(personal.kind, "personal");
  assert.equal(personal.shellProjectId, "personal-shell");
  assert.equal(JSON.parse(await readFile(indexPath, "utf8")).workspaces[0].kind, "personal");
});

test("project checkouts register worktrees under the project's workspace and follow the worktree list", async (t) => {
  const temp = await mkdtemp(join(tmpdir(), "nora-workspace-checkouts-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const projectPath = join(temp, "project"), worktreePath = join(temp, "worktree");
  await mkdir(projectPath); await mkdir(worktreePath);
  const branches = new Map<string, string>([[await realpath(projectPath), "main"], [await realpath(worktreePath), "feature/a"]]);
  const inspectCheckout = async (path: string) => ({ rootPath: path, branch: branches.get(path) ?? "", versionControl: "git" as const });
  let catalog: WorkspaceCatalog | undefined;
  const authority = new LocalWorkspaceAuthority({ environmentId: "local", registrations: () => catalog?.registrations() ?? [], inspectCheckout });
  const options = { indexPath: join(temp, "index.json"), personalPath: join(temp, "personal"), environmentId: "local", authority,
    prepare: (selection: WorkspaceRef) => new LocalWorkspaceAuthority({ environmentId: "local", inspectCheckout,
      registrations: () => [{ projectId: selection.projectId, checkoutId: selection.checkoutId, path: selection.path }] }).prepare(selection) };
  catalog = await openWorkspaceCatalog(options);
  assert.equal(await catalog.setProjectCheckouts("shell-project", [worktreePath]), false, "Unbound projects have no workspace to extend");
  const project = await catalog.bindProject("shell-project", projectPath, "Project");

  assert.equal(await catalog.setProjectCheckouts("shell-project", [projectPath, worktreePath, join(temp, "missing")]), true);
  const [checkout] = catalog.list()[0].checkouts ?? [];
  assert.equal(catalog.list()[0].checkouts?.length, 1, "The primary checkout and unreadable paths are not listed again");
  assert.equal(checkout.projectId, project.id);
  assert.equal(checkout.branch, "feature/a");
  await authority.verify(checkout);
  assert.equal((await authority.prepare(checkout)).path, checkout.path, "The execution host admits the worktree checkout");
  assert.equal(await catalog.setProjectCheckouts("shell-project", [worktreePath]), false, "An unchanged list is not rewritten");
  assert.deepEqual((await openWorkspaceCatalog(options)).list(), catalog.list(), "Checkouts persist");

  branches.set(await realpath(worktreePath), "feature/b");
  assert.equal(await catalog.setProjectCheckouts("shell-project", [worktreePath]), true);
  assert.equal(catalog.list()[0].checkouts?.[0].checkoutId, checkout.checkoutId, "A branch switch keeps the checkout's identity");
  assert.equal(catalog.list()[0].checkouts?.[0].branch, "feature/b");

  assert.equal(await catalog.setProjectCheckouts("shell-project", []), true);
  assert.equal(catalog.list()[0].checkouts, undefined);
  assert.equal(catalog.registrations().some((entry) => entry.checkoutId === checkout.checkoutId), false, "Removed worktrees are no longer selectable");
  await assert.rejects(authority.prepare(checkout), /registered checkout/);
});
