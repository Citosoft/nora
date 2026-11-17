import { execFile } from "node:child_process";
import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { TestContext } from "node:test";
import { LocalWorkspaceAuthority } from "@main/execution/localWorkspace";
import { createCheckoutInspector } from "@main/execution/workspaceGit";
import { createGitCheckpoints } from "@main/execution/checkpoints/gitService";
import type { FileSnapshot } from "@main/types/execution/checkpoints.types";

const execFileAsync = promisify(execFile);

export function snapshot(files: Record<string, string>, capturedAt = "2026-11-09T10:00:00.000Z"): FileSnapshot {
  return { capturedAt, files: Object.entries(files).map(([path, content]) => ({ path, mode: "100644", content: Buffer.from(content).toString("base64") })) };
}

export async function gitFixture(t: TestContext) {
  const directory = await realpath(await mkdtemp(join(tmpdir(), "nora-checkpoints-")));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = join(directory, "repo");
  await execFileAsync("git", ["init", "-b", "main", root]);
  const git = (...args: string[]) => execFileAsync("git", ["-C", root, ...args]);
  const write = (path: string, content: string | Buffer) => writeFile(join(root, path), content);
  await write("document.md", "Original\n"); await write("unchanged.md", "Unchanged\n");
  await git("add", ".");
  await git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "-c", "commit.gpgSign=false",
    "-c", `core.hooksPath=${join(directory, "unused-hooks")}`, "commit", "-m", "Fixture");
  const authority = new LocalWorkspaceAuthority({ environmentId: "local", registrations: () => [{ projectId: "project", checkoutId: "repo", path: root }],
    inspectCheckout: createCheckoutInspector("git") });
  const workspace = await authority.prepare({ environmentId: "local", projectId: "project", checkoutId: "repo", path: root, branch: "main", access: "write" });
  let clock = "2026-11-09T10:00:00.000Z";
  const now = () => clock;
  const service = createGitCheckpoints("git", authority, now);
  return { directory, root, git, write, workspace, authority, service, now, setTime(value: string) { clock = value; } };
}
