import type {
  ImportedContextBundleSummary,
  WorkspaceNoteSummary,
  WorkspacePathStatResult,
  WorkspaceSearchResult,
  WorkspaceSpecSummary,
  WorkspaceSplitViewCollection,
  WorkspaceTaskBoard,
  WorkspaceTaskSummary
} from "@shared/appTypes";
import { createDefaultWorkspaceSplitViewCollection } from "@shared/appTypes";
import { NORA_IMPORTED_CONTEXT_RELATIVE } from "@shared/constants/noraImportedContext";
import fs from "node:fs/promises";
import path from "node:path";
import { md5HexOfFile, md5HexOfUtf8String } from "./fileContentMd5";
import { buildImportedContextBundleListMetadata } from "./importedContextBundleMetadata";
import { normalizeWorkspaceTaskBoard, WORKSPACE_TASK_BOARD_PATH } from "../taskBoardStore";
import type { WorkspaceTarget } from "../types/internal.types";
import { normalizeWorkspaceSplitViewCollection } from "../workspaceSplitViewStore";
import { getWorkspaceStateAbsolutePath, loadWorkspaceStateStorageMode, WORKSPACE_SPLIT_VIEWS_PATH } from "../workspaceStatePaths";

type WorkspaceOpsDeps = {
  getWorkspaceLocation: (target: WorkspaceTarget) => { kind: "local" } | { kind: "ssh"; host: string; user: string; port: number | null; remotePath: string; alias?: string | null };
  runRemoteSshCommand: (target: WorkspaceTarget, command: string) => Promise<{ stdout: string; stderr: string }>;
  normalizeWorkspaceRelativePath: (relativePath: string) => string;
  normalizeRemoteShellPath: (value: string) => string;
  shellQuote: (value: string) => string;
  execGit: (target: WorkspaceTarget, args: string[], maxBuffer?: number) => Promise<{ stdout: string; stderr: string }>;
  workspaceInternalDirName: string;
  maxWorkspaceSearchResults: number;
};

const IMPORTED_CONTEXT_BUNDLE_HEADER_BYTES = 24 * 1024;
const IMPORTED_CONTEXT_BUNDLE_MAX_FULL_READ_BYTES = 5 * 1024 * 1024;
const WORKSPACE_FILE_LIST_MAX_BUFFER_BYTES = 64 * 1024 * 1024;

export function createWorkspaceOperations(deps: WorkspaceOpsDeps) {
  function getStatePath(target: WorkspaceTarget, projectId: string, relativePath: string, storageMode = loadWorkspaceStateStorageMode()): string {
    return getWorkspaceStateAbsolutePath(target, projectId, storageMode, relativePath);
  }

  function getAlternateStorageMode() {
    return loadWorkspaceStateStorageMode() === "repo" ? "home" as const : "repo" as const;
  }

  async function statePathExists(target: WorkspaceTarget, absolutePath: string): Promise<boolean> {
    const location = deps.getWorkspaceLocation(target);
    if (location.kind === "ssh") {
      const normalizedPath = deps.normalizeRemoteShellPath(absolutePath);
      const renderedPath = normalizedPath.startsWith("$HOME/") ? normalizedPath : deps.shellQuote(normalizedPath);
      try {
        await deps.runRemoteSshCommand(target, `test -e ${renderedPath}`);
        return true;
      } catch {
        return false;
      }
    }

    try {
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  function getRepoAbsolutePath(target: WorkspaceTarget, relativePath: string): string {
    return deps.getWorkspaceLocation(target).kind === "ssh"
      ? path.posix.join(target.path.replace(/\\/g, "/"), relativePath.replace(/\\/g, "/"))
      : path.join(target.path, relativePath);
  }

  async function resolveWorkspaceAbsolutePath(
    target: WorkspaceTarget,
    projectId: string,
    relativePath: string
  ): Promise<string> {
    return isWorkspaceInternalPath(relativePath)
      ? getStatePath(target, projectId, relativePath)
      : getRepoAbsolutePath(target, relativePath);
  }

  async function resolveExistingWorkspaceAbsolutePath(
    target: WorkspaceTarget,
    projectId: string,
    relativePath: string
  ): Promise<string> {
    if (!isWorkspaceInternalPath(relativePath)) {
      return getRepoAbsolutePath(target, relativePath);
    }

    const selectedPath = getStatePath(target, projectId, relativePath);
    if (await statePathExists(target, selectedPath)) {
      return selectedPath;
    }

    const alternatePath = getStatePath(target, projectId, relativePath, getAlternateStorageMode());
    return await statePathExists(target, alternatePath) ? alternatePath : selectedPath;
  }

  function toWorkspaceRelativePath(target: WorkspaceTarget, projectId: string, absolutePath: string): string {
    const selectedRoot = getStatePath(target, projectId, "");
    const alternateRoot = getStatePath(target, projectId, "", getAlternateStorageMode());
    const normalizedAbsolute = absolutePath.replace(/\\/g, "/");
    const normalizedSelectedRoot = selectedRoot.replace(/\\/g, "/").replace(/\/$/, "");
    const normalizedAlternateRoot = alternateRoot.replace(/\\/g, "/").replace(/\/$/, "");
    const root = normalizedAbsolute.startsWith(`${normalizedSelectedRoot}/`)
      ? normalizedSelectedRoot
      : normalizedAbsolute.startsWith(`${normalizedAlternateRoot}/`)
        ? normalizedAlternateRoot
        : normalizedSelectedRoot;
    return path.posix.relative(root, normalizedAbsolute).replace(/\\/g, "/");
  }

  async function readWorkspaceTextFile(target: WorkspaceTarget, projectId: string, relativePath: string): Promise<string> {
    const safeRelativePath = deps.normalizeWorkspaceRelativePath(relativePath);
    const absolutePath = await resolveExistingWorkspaceAbsolutePath(target, projectId, safeRelativePath);
    const location = deps.getWorkspaceLocation(target);
    if (location.kind === "ssh") {
      const normalizedPath = deps.normalizeRemoteShellPath(absolutePath);
      const command = `cat ${normalizedPath.startsWith("$HOME/") ? normalizedPath : deps.shellQuote(normalizedPath)}`;
      return (await deps.runRemoteSshCommand(target, command)).stdout;
    }
    return fs.readFile(absolutePath, "utf8");
  }

  async function readWorkspaceBinaryFile(target: WorkspaceTarget, projectId: string, relativePath: string): Promise<Buffer> {
    const safeRelativePath = deps.normalizeWorkspaceRelativePath(relativePath);
    const absolutePath = await resolveExistingWorkspaceAbsolutePath(target, projectId, safeRelativePath);
    const location = deps.getWorkspaceLocation(target);
    if (location.kind === "ssh") {
      const normalizedPath = deps.normalizeRemoteShellPath(absolutePath);
      const command = `base64 -w 0 ${normalizedPath.startsWith("$HOME/") ? normalizedPath : deps.shellQuote(normalizedPath)}`;
      const { stdout } = await deps.runRemoteSshCommand(target, command);
      return Buffer.from(stdout.trim(), "base64");
    }

    return fs.readFile(absolutePath);
  }

  function getWorkspaceImageMimeType(relativePath: string): string {
    const normalized = relativePath.toLowerCase();
    if (normalized.endsWith(".png")) return "image/png";
    if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) return "image/jpeg";
    if (normalized.endsWith(".gif")) return "image/gif";
    if (normalized.endsWith(".webp")) return "image/webp";
    if (normalized.endsWith(".bmp")) return "image/bmp";
    if (normalized.endsWith(".svg")) return "image/svg+xml";
    return "application/octet-stream";
  }

  function isRepoAnchoredNoraImportedContextPath(relativePath: string): boolean {
    const n = relativePath.replace(/\\/g, "/").replace(/^\//, "");
    return n === NORA_IMPORTED_CONTEXT_RELATIVE || n.startsWith(`${NORA_IMPORTED_CONTEXT_RELATIVE}/`);
  }

  function isWorkspaceInternalPath(relativePath: string): boolean {
    if (isRepoAnchoredNoraImportedContextPath(relativePath)) {
      return false;
    }
    return relativePath === deps.workspaceInternalDirName || relativePath.startsWith(`${deps.workspaceInternalDirName}/`);
  }

  function workspaceGitignoreContainsNoraRule(content: string): boolean {
    return content
      .split(/\r?\n/)
      .some((line) => /^\/?\.nora\/?$/.test(line.trim()));
  }

  async function ensureWorkspaceInternalDirIgnored(target: WorkspaceTarget): Promise<void> {
    if (loadWorkspaceStateStorageMode() !== "repo") {
      return;
    }
    const location = deps.getWorkspaceLocation(target);
    if (location.kind === "ssh") {
      await deps.runRemoteSshCommand(
        target,
        "touch .gitignore && if ! grep -Eq '^[[:space:]]*/?\\.nora/?[[:space:]]*$' .gitignore; then printf '\\n.nora/\\n' >> .gitignore; fi"
      );
      return;
    }

    const gitignorePath = path.join(target.path, ".gitignore");
    let existing = "";
    try {
      existing = await fs.readFile(gitignorePath, "utf8");
    } catch {}

    if (workspaceGitignoreContainsNoraRule(existing)) {
      return;
    }

    const nextContent = existing.trim().length ? `${existing.replace(/\s*$/, "")}\n.nora/\n` : ".nora/\n";
    await fs.writeFile(gitignorePath, nextContent, "utf8");
  }

  async function writeWorkspaceTextFile(target: WorkspaceTarget, projectId: string, relativePath: string, content: string): Promise<void> {
    const safeRelativePath = deps.normalizeWorkspaceRelativePath(relativePath);
    if (isWorkspaceInternalPath(safeRelativePath)) {
      await ensureWorkspaceInternalDirIgnored(target);
    }
    const absolutePath = await resolveWorkspaceAbsolutePath(target, projectId, safeRelativePath);
    const location = deps.getWorkspaceLocation(target);
    if (location.kind === "ssh") {
      const normalizedPath = deps.normalizeRemoteShellPath(absolutePath);
      const normalizedParent = deps.normalizeRemoteShellPath(path.posix.dirname(absolutePath));
      const renderedPath = normalizedPath.startsWith("$HOME/") ? normalizedPath : deps.shellQuote(normalizedPath);
      const renderedParent = normalizedParent.startsWith("$HOME/") ? normalizedParent : deps.shellQuote(normalizedParent);
      const encoded = Buffer.from(content, "utf8").toString("base64");
      await deps.runRemoteSshCommand(
        target,
        `mkdir -p ${renderedParent} && printf %s ${deps.shellQuote(encoded)} | base64 -d > ${renderedPath}`
      );
      return;
    }

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, "utf8");
  }

  async function writeWorkspaceBinaryFile(target: WorkspaceTarget, projectId: string, relativePath: string, content: Buffer): Promise<void> {
    const safeRelativePath = deps.normalizeWorkspaceRelativePath(relativePath);
    if (isWorkspaceInternalPath(safeRelativePath)) {
      await ensureWorkspaceInternalDirIgnored(target);
    }
    const absolutePath = await resolveWorkspaceAbsolutePath(target, projectId, safeRelativePath);
    const location = deps.getWorkspaceLocation(target);
    if (location.kind === "ssh") {
      const normalizedPath = deps.normalizeRemoteShellPath(absolutePath);
      const normalizedParent = deps.normalizeRemoteShellPath(path.posix.dirname(absolutePath));
      const renderedPath = normalizedPath.startsWith("$HOME/") ? normalizedPath : deps.shellQuote(normalizedPath);
      const renderedParent = normalizedParent.startsWith("$HOME/") ? normalizedParent : deps.shellQuote(normalizedParent);
      const encoded = content.toString("base64");
      await deps.runRemoteSshCommand(
        target,
        `mkdir -p ${renderedParent} && printf %s ${deps.shellQuote(encoded)} | base64 -d > ${renderedPath}`
      );
      return;
    }

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content);
  }

  async function createWorkspaceDirectory(target: WorkspaceTarget, projectId: string, relativePath: string): Promise<void> {
    const safeRelativePath = deps.normalizeWorkspaceRelativePath(relativePath);
    if (isWorkspaceInternalPath(safeRelativePath)) {
      await ensureWorkspaceInternalDirIgnored(target);
    }
    const absolutePath = await resolveWorkspaceAbsolutePath(target, projectId, safeRelativePath);
    const location = deps.getWorkspaceLocation(target);
    if (location.kind === "ssh") {
      const normalizedPath = deps.normalizeRemoteShellPath(absolutePath);
      const renderedPath = normalizedPath.startsWith("$HOME/") ? normalizedPath : deps.shellQuote(normalizedPath);
      await deps.runRemoteSshCommand(target, `mkdir -p ${renderedPath}`);
      return;
    }

    await fs.mkdir(absolutePath, { recursive: true });
  }

  async function moveWorkspaceFile(target: WorkspaceTarget, projectId: string, fromPath: string, toPath: string): Promise<void> {
    const safeFromPath = deps.normalizeWorkspaceRelativePath(fromPath);
    const safeToPath = deps.normalizeWorkspaceRelativePath(toPath);
    const isInternalMove = isWorkspaceInternalPath(safeFromPath) || isWorkspaceInternalPath(safeToPath);
    if (isInternalMove) {
      await ensureWorkspaceInternalDirIgnored(target);
    }
    const location = deps.getWorkspaceLocation(target);

    if (!isInternalMove) {
      const absoluteFromPath = getRepoAbsolutePath(target, safeFromPath);
      const absoluteToPath = getRepoAbsolutePath(target, safeToPath);
      if (location.kind === "ssh") {
        const remoteFromPath = deps.normalizeRemoteShellPath(absoluteFromPath);
        const remoteToPath = deps.normalizeRemoteShellPath(absoluteToPath);
        const remoteParent = deps.normalizeRemoteShellPath(path.posix.dirname(absoluteToPath));
        const renderedFrom = remoteFromPath.startsWith("$HOME/") ? remoteFromPath : deps.shellQuote(remoteFromPath);
        const renderedTo = remoteToPath.startsWith("$HOME/") ? remoteToPath : deps.shellQuote(remoteToPath);
        const renderedParent = remoteParent.startsWith("$HOME/") ? remoteParent : deps.shellQuote(remoteParent);
        await deps.runRemoteSshCommand(target, `mkdir -p ${renderedParent} && mv ${renderedFrom} ${renderedTo}`);
        return;
      }

      await fs.mkdir(path.dirname(absoluteToPath), { recursive: true });
      await fs.rename(absoluteFromPath, absoluteToPath);
      return;
    }

    const absoluteFromPath = await resolveExistingWorkspaceAbsolutePath(target, projectId, safeFromPath);
    const normalizedAbsoluteFromPath = absoluteFromPath.replace(/\\/g, "/");
    const sourceRoot = normalizedAbsoluteFromPath.endsWith(safeFromPath)
      ? normalizedAbsoluteFromPath.slice(0, -safeFromPath.length).replace(/\/$/, "")
      : getStatePath(target, projectId, "").replace(/\\/g, "/").replace(/\/$/, "");

    if (location.kind === "ssh") {
      const remoteToPath = deps.normalizeRemoteShellPath(path.posix.join(sourceRoot, safeToPath));
      const remoteFromPath = deps.normalizeRemoteShellPath(absoluteFromPath);
      const remoteParent = deps.normalizeRemoteShellPath(path.posix.dirname(remoteToPath));
      const renderedFrom = remoteFromPath.startsWith("$HOME/") ? remoteFromPath : deps.shellQuote(remoteFromPath);
      const renderedTo = remoteToPath.startsWith("$HOME/") ? remoteToPath : deps.shellQuote(remoteToPath);
      const renderedParent = remoteParent.startsWith("$HOME/") ? remoteParent : deps.shellQuote(remoteParent);
      await deps.runRemoteSshCommand(target, `mkdir -p ${renderedParent} && mv ${renderedFrom} ${renderedTo}`);
      return;
    }

    const nextAbsoluteToPath = path.join(sourceRoot, safeToPath);
    await fs.mkdir(path.dirname(nextAbsoluteToPath), { recursive: true });
    await fs.rename(absoluteFromPath, nextAbsoluteToPath);
  }

  async function deleteWorkspaceFile(target: WorkspaceTarget, projectId: string, relativePath: string): Promise<void> {
    const safeRelativePath = deps.normalizeWorkspaceRelativePath(relativePath);
    const absolutePath = await resolveExistingWorkspaceAbsolutePath(target, projectId, safeRelativePath);
    const location = deps.getWorkspaceLocation(target);

    if (location.kind === "ssh") {
      const remotePath = deps.normalizeRemoteShellPath(absolutePath);
      const renderedPath = remotePath.startsWith("$HOME/") ? remotePath : deps.shellQuote(remotePath);
      await deps.runRemoteSshCommand(target, `rm -rf ${renderedPath}`);
      return;
    }

    await fs.rm(absolutePath, { recursive: true, force: true });
  }

  function collectAncestorDirectories(filePaths: string[]): string[] {
    const directories = new Set<string>();
    for (const filePath of filePaths) {
      const parts = filePath.split("/").filter(Boolean);
      let current = "";
      for (let index = 0; index < parts.length - 1; index += 1) {
        current = current ? `${current}/${parts[index]}` : parts[index];
        directories.add(current);
      }
    }
    return Array.from(directories);
  }

  async function listWorkspaceEmptyDirectories(target: WorkspaceTarget): Promise<string[]> {
    const location = deps.getWorkspaceLocation(target);
    if (location.kind === "ssh") {
      const normalizedRoot = deps.normalizeRemoteShellPath(target.path.replace(/\\/g, "/"));
      const renderedRoot = normalizedRoot.startsWith("$HOME/") ? normalizedRoot : deps.shellQuote(normalizedRoot);
      const { stdout } = await deps.runRemoteSshCommand(
        target,
        `if [ -d ${renderedRoot} ]; then find ${renderedRoot} -path '*/.git' -prune -o -type d -empty -print; fi`
      );
      return stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((absolutePath) => path.posix.relative(target.path.replace(/\\/g, "/"), absolutePath))
        .map((relativePath) => relativePath.replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/^\/+/, ""))
        .filter((relativePath) => relativePath.length > 0 && !relativePath.startsWith("../"));
    }

    const emptyDirectories: string[] = [];
    const walk = async (absoluteDirectoryPath: string, relativeDirectoryPath: string): Promise<boolean> => {
      const entries = await fs.readdir(absoluteDirectoryPath, { withFileTypes: true }).catch(() => []);
      const visibleEntries = entries.filter((entry) => entry.name !== ".git");
      let hasVisibleContent = false;

      for (const entry of visibleEntries) {
        hasVisibleContent = true;
        if (!entry.isDirectory()) {
          continue;
        }
        const childRelativePath = relativeDirectoryPath ? `${relativeDirectoryPath}/${entry.name}` : entry.name;
        await walk(path.join(absoluteDirectoryPath, entry.name), childRelativePath);
      }

      if (!hasVisibleContent && relativeDirectoryPath) {
        emptyDirectories.push(relativeDirectoryPath);
      }

      return hasVisibleContent;
    };

    await walk(target.path, "");
    return emptyDirectories;
  }

  async function listWorkspaceDirectories(target: WorkspaceTarget): Promise<string[]> {
    const filePaths = await listWorkspaceTrackedAndUntrackedFiles(target);
    const trackedDirectories = collectAncestorDirectories(filePaths);
    const emptyDirectories = await listWorkspaceEmptyDirectories(target);
    const unique = new Set<string>([...trackedDirectories, ...emptyDirectories]);
    return Array.from(unique).sort((left, right) => left.localeCompare(right));
  }

  async function listWorkspaceTrackedAndUntrackedFiles(target: WorkspaceTarget): Promise<string[]> {
    const { stdout } = await deps.execGit(
      target,
      ["ls-files", "--cached", "--others", "--exclude-standard", "--full-name"],
      WORKSPACE_FILE_LIST_MAX_BUFFER_BYTES
    );
    const unique = new Set(
      stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    );
    return Array.from(unique).sort((left, right) => left.localeCompare(right));
  }

  function normalizeWorkspaceSearchTerms(query: string): string[] {
    return Array.from(new Set(query.trim().split(/\s+/).map((term) => term.trim()).filter(Boolean)));
  }

  async function statWorkspacePath(target: WorkspaceTarget, projectId: string, relativePath: string): Promise<WorkspacePathStatResult> {
    const safeRelativePath = deps.normalizeWorkspaceRelativePath(relativePath);
    const absolutePath = await resolveExistingWorkspaceAbsolutePath(target, projectId, safeRelativePath);
    const location = deps.getWorkspaceLocation(target);
    if (location.kind === "ssh") {
      const normalizedPath = deps.normalizeRemoteShellPath(absolutePath);
      const rendered = normalizedPath.startsWith("$HOME/") ? normalizedPath : deps.shellQuote(normalizedPath);
      const { stdout } = await deps.runRemoteSshCommand(
        target,
        `if [ -f ${rendered} ]; then echo file; elif [ -d ${rendered} ]; then echo directory; else echo missing; fi`
      );
      const flag = stdout.trim();
      if (flag === "file") {
        return { exists: true, kind: "file" };
      }
      if (flag === "directory") {
        return { exists: true, kind: "directory" };
      }
      return { exists: false, kind: null };
    }

    const stats = await fs.stat(absolutePath).catch(() => null);
    if (!stats) {
      return { exists: false, kind: null };
    }
    if (stats.isFile()) {
      return { exists: true, kind: "file" };
    }
    if (stats.isDirectory()) {
      return { exists: true, kind: "directory" };
    }
    return { exists: false, kind: null };
  }

  async function searchWorkspaceFiles(target: WorkspaceTarget, query: string, caseSensitive = false): Promise<WorkspaceSearchResult[]> {
    const terms = normalizeWorkspaceSearchTerms(query);
    if (!terms.length) {
      return [];
    }

    const args = ["grep", "-n", "-I", "--full-name", "--no-color", "--untracked"];
    if (!caseSensitive) {
      args.push("-i");
    }
    terms.forEach((term, index) => {
      if (index > 0) {
        args.push("--and");
      }
      args.push("-e", term);
    });

    try {
      const { stdout } = await deps.execGit(target, args);
      const resultsByPath = new Map<string, WorkspaceSearchResult>();

      for (const rawLine of stdout.split(/\r?\n/)) {
        const match = rawLine.match(/^(.+?):(\d+):(.*)$/);
        if (!match) {
          continue;
        }

        const [, pathName, lineNumberValue, lineText] = match;
        const existing = resultsByPath.get(pathName);
        if (existing) {
          existing.matchCount += 1;
          continue;
        }

        resultsByPath.set(pathName, {
          path: pathName,
          lineNumber: Number.parseInt(lineNumberValue, 10) || null,
          lineText: lineText.trim() || null,
          matchCount: 1
        });

        if (resultsByPath.size >= deps.maxWorkspaceSearchResults) {
          break;
        }
      }

      return Array.from(resultsByPath.values());
    } catch (error: unknown) {
      const exitCode = typeof error === "object" && error !== null && "code" in error ? error.code : null;
      if (exitCode === 1) {
        return [];
      }
      throw error;
    }
  }

  function extractMarkdownTitle(content: string, fallbackPath: string): string {
    const heading = content.split(/\r?\n/).map((line) => line.trim()).find((line) => line.startsWith("# "));
    if (heading) {
      return heading.replace(/^#\s+/, "").trim();
    }
    const fileName = fallbackPath.split("/").pop() || fallbackPath;
    return fileName.replace(/\.md$/i, "").replace(/[-_]+/g, " ").trim() || "Untitled task";
  }

  async function listWorkspaceTaskPaths(target: WorkspaceTarget, projectId: string): Promise<string[]> {
    const tasksRoot = ".nora/tasks";
    const absoluteRoot = await resolveExistingWorkspaceAbsolutePath(target, projectId, tasksRoot);
    const location = deps.getWorkspaceLocation(target);

    if (location.kind === "ssh") {
      const remoteRoot = deps.normalizeRemoteShellPath(absoluteRoot);
      const renderedRoot = remoteRoot.startsWith("$HOME/") ? remoteRoot : deps.shellQuote(remoteRoot);
      const command = [`if [ ! -d ${renderedRoot} ]; then`, "  exit 0", "fi", `find ${renderedRoot} -type f \\( -name '*.md' -o -name '*.markdown' \\) | sort`].join("\n");
      const { stdout } = await deps.runRemoteSshCommand(target, command);
      return stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((taskPath) => toWorkspaceRelativePath(target, projectId, taskPath))
        .sort((left, right) => left.localeCompare(right));
    }

    const discovered: string[] = [];

    const visit = async (absoluteDir: string, relativeDir: string): Promise<void> => {
      const entries = await fs.readdir(absoluteDir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await visit(path.join(absoluteDir, entry.name), relativeDir ? `${relativeDir}/${entry.name}` : entry.name);
          continue;
        }
        if (!entry.isFile() || !/\.(md|markdown)$/i.test(entry.name)) {
          continue;
        }
        const relativePath = relativeDir ? `${tasksRoot}/${relativeDir}/${entry.name}` : `${tasksRoot}/${entry.name}`;
        discovered.push(relativePath.replace(/\\/g, "/"));
      }
    };

    await visit(absoluteRoot, "");
    return discovered.sort((left, right) => left.localeCompare(right));
  }

  async function listWorkspaceTasks(target: WorkspaceTarget, projectId: string): Promise<WorkspaceTaskSummary[]> {
    const paths = await listWorkspaceTaskPaths(target, projectId);
    const summaries = await Promise.all(
      paths.map(async (taskPath) => {
        const content = await readWorkspaceTextFile(target, projectId, taskPath).catch(() => "");
        let updatedAt: string | null = null;
        if (deps.getWorkspaceLocation(target).kind === "local") {
          const stats = await fs.stat(await resolveExistingWorkspaceAbsolutePath(target, projectId, taskPath)).catch(() => null);
          updatedAt = stats?.mtime.toISOString() ?? null;
        }
        return {
          path: taskPath,
          title: extractMarkdownTitle(content, taskPath),
          updatedAt,
          completed: taskPath.startsWith(".nora/tasks/completed/")
        } satisfies WorkspaceTaskSummary;
      })
    );
    return summaries;
  }

  function isWorkspaceSpecPath(relativePath: string): boolean {
    return /^\.nora\/specs\/.+\.(md|markdown)$/i.test(relativePath);
  }

  async function listWorkspaceSpecPaths(target: WorkspaceTarget, projectId: string): Promise<string[]> {
    const specsRoot = ".nora/specs";
    const absoluteRoot = await resolveExistingWorkspaceAbsolutePath(target, projectId, specsRoot);
    const location = deps.getWorkspaceLocation(target);

    if (location.kind === "ssh") {
      const remoteRoot = deps.normalizeRemoteShellPath(absoluteRoot);
      const renderedRoot = remoteRoot.startsWith("$HOME/") ? remoteRoot : deps.shellQuote(remoteRoot);
      const command = [`if [ ! -d ${renderedRoot} ]; then`, "  exit 0", "fi", `find ${renderedRoot} -type f \\( -name '*.md' -o -name '*.markdown' \\) | sort`].join("\n");
      const { stdout } = await deps.runRemoteSshCommand(target, command);
      return stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((specPath) => toWorkspaceRelativePath(target, projectId, specPath))
        .sort((left, right) => left.localeCompare(right));
    }

    const discovered: string[] = [];

    const visit = async (absoluteDir: string, relativeDir: string): Promise<void> => {
      const entries = await fs.readdir(absoluteDir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await visit(path.join(absoluteDir, entry.name), relativeDir ? `${relativeDir}/${entry.name}` : entry.name);
          continue;
        }
        if (!entry.isFile() || !/\.(md|markdown)$/i.test(entry.name)) {
          continue;
        }
        const relativePath = relativeDir ? `${specsRoot}/${relativeDir}/${entry.name}` : `${specsRoot}/${entry.name}`;
        discovered.push(relativePath.replace(/\\/g, "/"));
      }
    };

    await visit(absoluteRoot, "");
    return discovered.sort((left, right) => left.localeCompare(right));
  }

  async function listWorkspaceSpecs(target: WorkspaceTarget, projectId: string): Promise<WorkspaceSpecSummary[]> {
    const paths = await listWorkspaceSpecPaths(target, projectId);
    const summaries = await Promise.all(
      paths.map(async (specPath) => {
        const content = await readWorkspaceTextFile(target, projectId, specPath).catch(() => "");
        let updatedAt: string | null = null;
        if (deps.getWorkspaceLocation(target).kind === "local") {
          const stats = await fs.stat(await resolveExistingWorkspaceAbsolutePath(target, projectId, specPath)).catch(() => null);
          updatedAt = stats?.mtime.toISOString() ?? null;
        }
        return {
          path: specPath,
          title: extractMarkdownTitle(content, specPath),
          updatedAt
        } satisfies WorkspaceSpecSummary;
      })
    );
    return summaries;
  }

  function isWorkspaceNotePath(relativePath: string): boolean {
    return /^\.nora\/notes\/.+\.(md|markdown)$/i.test(relativePath);
  }

  async function listWorkspaceNotePaths(target: WorkspaceTarget, projectId: string): Promise<string[]> {
    const notesRoot = ".nora/notes";
    const absoluteRoot = await resolveExistingWorkspaceAbsolutePath(target, projectId, notesRoot);
    const location = deps.getWorkspaceLocation(target);

    if (location.kind === "ssh") {
      const remoteRoot = deps.normalizeRemoteShellPath(absoluteRoot);
      const renderedRoot = remoteRoot.startsWith("$HOME/") ? remoteRoot : deps.shellQuote(remoteRoot);
      const command = [`if [ ! -d ${renderedRoot} ]; then`, "  exit 0", "fi", `find ${renderedRoot} -type f \\( -name '*.md' -o -name '*.markdown' \\) | sort`].join("\n");
      const { stdout } = await deps.runRemoteSshCommand(target, command);
      return stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((notePath) => toWorkspaceRelativePath(target, projectId, notePath))
        .sort((left, right) => left.localeCompare(right));
    }

    const discovered: string[] = [];

    const visit = async (absoluteDir: string, relativeDir: string): Promise<void> => {
      const entries = await fs.readdir(absoluteDir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await visit(path.join(absoluteDir, entry.name), relativeDir ? `${relativeDir}/${entry.name}` : entry.name);
          continue;
        }
        if (!entry.isFile() || !/\.(md|markdown)$/i.test(entry.name)) {
          continue;
        }
        const relativePath = relativeDir ? `${notesRoot}/${relativeDir}/${entry.name}` : `${notesRoot}/${entry.name}`;
        discovered.push(relativePath.replace(/\\/g, "/"));
      }
    };

    await visit(absoluteRoot, "");
    return discovered.sort((left, right) => left.localeCompare(right));
  }

  async function listWorkspaceNotes(target: WorkspaceTarget, projectId: string): Promise<WorkspaceNoteSummary[]> {
    const paths = await listWorkspaceNotePaths(target, projectId);
    const summaries = await Promise.all(
      paths.map(async (notePath) => {
        const content = await readWorkspaceTextFile(target, projectId, notePath).catch(() => "");
        let updatedAt: string | null = null;
        if (deps.getWorkspaceLocation(target).kind === "local") {
          const stats = await fs.stat(await resolveExistingWorkspaceAbsolutePath(target, projectId, notePath)).catch(() => null);
          updatedAt = stats?.mtime.toISOString() ?? null;
        }
        return {
          path: notePath,
          title: extractMarkdownTitle(content, notePath),
          updatedAt
        } satisfies WorkspaceNoteSummary;
      })
    );
    return summaries;
  }

  function isWorkspaceTaskPath(relativePath: string): boolean {
    return /^\.nora\/tasks\/.+\.(md|markdown)$/i.test(relativePath);
  }

  async function readWorkspaceTaskBoard(target: WorkspaceTarget, projectId: string, taskPaths?: string[]): Promise<WorkspaceTaskBoard> {
    const validTaskPaths = new Set(taskPaths ?? await listWorkspaceTaskPaths(target, projectId));
    try {
      const raw = await readWorkspaceTextFile(target, projectId, WORKSPACE_TASK_BOARD_PATH);
      const parsed = JSON.parse(raw) as unknown;
      const normalized = normalizeWorkspaceTaskBoard(parsed, validTaskPaths);
      if (normalized.changed) {
        await writeWorkspaceTextFile(target, projectId, WORKSPACE_TASK_BOARD_PATH, JSON.stringify(normalized.board, null, 2));
      }
      return normalized.board;
    } catch {
      return normalizeWorkspaceTaskBoard(null, validTaskPaths).board;
    }
  }

  async function writeWorkspaceTaskBoard(target: WorkspaceTarget, projectId: string, board: WorkspaceTaskBoard, taskPaths?: string[]): Promise<WorkspaceTaskBoard> {
    const validTaskPaths = new Set(taskPaths ?? await listWorkspaceTaskPaths(target, projectId));
    const normalized = normalizeWorkspaceTaskBoard(board, validTaskPaths).board;
    await writeWorkspaceTextFile(target, projectId, WORKSPACE_TASK_BOARD_PATH, JSON.stringify(normalized, null, 2));
    return normalized;
  }

  async function readWorkspaceSplitViewCollection(target: WorkspaceTarget, projectId: string): Promise<WorkspaceSplitViewCollection> {
    try {
      const raw = await readWorkspaceTextFile(target, projectId, WORKSPACE_SPLIT_VIEWS_PATH);
      const normalized = normalizeWorkspaceSplitViewCollection(JSON.parse(raw) as unknown);
      if (normalized.changed) {
        await writeWorkspaceSplitViewCollection(target, projectId, normalized.collection);
      }
      return normalized.collection;
    } catch {
      return createDefaultWorkspaceSplitViewCollection();
    }
  }

  async function writeWorkspaceSplitViewCollection(
    target: WorkspaceTarget,
    projectId: string,
    collection: WorkspaceSplitViewCollection
  ): Promise<WorkspaceSplitViewCollection> {
    const normalized = normalizeWorkspaceSplitViewCollection(collection).collection;
    await writeWorkspaceTextFile(target, projectId, WORKSPACE_SPLIT_VIEWS_PATH, JSON.stringify(normalized, null, 2));
    return normalized;
  }

  async function renameWorkspaceTaskBoardPosition(
    target: WorkspaceTarget,
    projectId: string,
    fromPath: string,
    toPath: string
  ): Promise<void> {
    if (!isWorkspaceTaskPath(fromPath) || !isWorkspaceTaskPath(toPath)) {
      return;
    }
    const board = await readWorkspaceTaskBoard(target, projectId);
    const existing = board.taskPositions[fromPath];
    if (!existing) {
      return;
    }
    const nextBoard: WorkspaceTaskBoard = {
      ...board,
      taskPositions: {
        ...board.taskPositions,
        [toPath]: existing
      },
      taskAssignments: {
        ...board.taskAssignments
      }
    };
    delete nextBoard.taskPositions[fromPath];
    if (board.taskAssignments[fromPath]) {
      nextBoard.taskAssignments[toPath] = board.taskAssignments[fromPath];
      delete nextBoard.taskAssignments[fromPath];
    }
    await writeWorkspaceTaskBoard(target, projectId, nextBoard);
  }

  async function removeWorkspaceTaskBoardPosition(target: WorkspaceTarget, projectId: string, taskPath: string): Promise<void> {
    if (!isWorkspaceTaskPath(taskPath)) {
      return;
    }
    const board = await readWorkspaceTaskBoard(target, projectId);
    if (!board.taskPositions[taskPath]) {
      return;
    }
    const nextTaskPositions = { ...board.taskPositions };
    const nextTaskAssignments = { ...board.taskAssignments };
    delete nextTaskPositions[taskPath];
    delete nextTaskAssignments[taskPath];
    await writeWorkspaceTaskBoard(target, projectId, {
      ...board,
      taskPositions: nextTaskPositions,
      taskAssignments: nextTaskAssignments
    });
  }

  function getDefaultTaskBoardSectionId(board: WorkspaceTaskBoard): string {
    return board.sections[0]?.id || "todo";
  }

  function addTaskToWorkspaceTaskBoard(board: WorkspaceTaskBoard, taskPath: string): WorkspaceTaskBoard {
    const sectionId = getDefaultTaskBoardSectionId(board);
    const highestOrder = Object.values(board.taskPositions)
      .filter((position) => position.sectionId === sectionId)
      .reduce((maxOrder, position) => Math.max(maxOrder, position.order), 0);

    return {
      ...board,
      taskPositions: {
        ...board.taskPositions,
        [taskPath]: {
          sectionId,
          order: highestOrder + 1000
        }
      }
    };
  }

  async function readLocalImportedBundleHeader(absFile: string): Promise<string> {
    const fh = await fs.open(absFile, "r");
    try {
      const stat = await fh.stat();
      const byteLength = Math.min(IMPORTED_CONTEXT_BUNDLE_HEADER_BYTES, Math.max(0, Number(stat.size)));
      if (byteLength === 0) {
        return "";
      }
      const buf = Buffer.alloc(byteLength);
      const { bytesRead } = await fh.read(buf, 0, byteLength, 0);
      return buf.subarray(0, bytesRead).toString("utf8");
    } finally {
      await fh.close();
    }
  }

  function importedContextBundleSortMs(row: ImportedContextBundleSummary): number {
    const iso = row.handoffCreatedAt || row.updatedAt;
    if (!iso) {
      return 0;
    }
    const ms = Date.parse(iso);
    return Number.isNaN(ms) ? 0 : ms;
  }

  function parseOpensslMd5Stdout(stdout: string): string | null {
    const trimmed = stdout.trim();
    if (!trimmed) {
      return null;
    }
    const eq = trimmed.lastIndexOf("=");
    if (eq < 0) {
      return null;
    }
    const hex = trimmed.slice(eq + 1).replace(/\s+/g, "").toLowerCase();
    return /^[a-f0-9]{32}$/.test(hex) ? hex : null;
  }

  async function hashImportedContextBundleLocal(absFile: string, fullUtf8: string | null, sizeBytes: number): Promise<string | null> {
    if (sizeBytes <= 0) {
      return md5HexOfUtf8String("");
    }
    if (fullUtf8 != null) {
      return md5HexOfUtf8String(fullUtf8);
    }
    return md5HexOfFile(absFile);
  }

  async function listImportedContextBundles(target: WorkspaceTarget, projectId: string): Promise<ImportedContextBundleSummary[]> {
    const absoluteRoot = getRepoAbsolutePath(target, NORA_IMPORTED_CONTEXT_RELATIVE);
    const location = deps.getWorkspaceLocation(target);

    if (location.kind === "ssh") {
      const normalizedRoot = deps.normalizeRemoteShellPath(absoluteRoot);
      const renderedRoot = normalizedRoot.startsWith("$HOME/") ? normalizedRoot : deps.shellQuote(normalizedRoot);
      const command = [
        `if [ ! -d ${renderedRoot} ]; then`,
        "  exit 0",
        "fi",
        `find ${renderedRoot} -maxdepth 1 -type f -name 'context-bundle-*.md' 2>/dev/null | sort`
      ].join("\n");
      const { stdout } = await deps.runRemoteSshCommand(target, command);
      const absPaths = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const results: ImportedContextBundleSummary[] = [];
      for (const abs of absPaths) {
        const renderedFile = abs.startsWith("$HOME/") ? abs : deps.shellQuote(abs);
        const { stdout: wcOut } = await deps.runRemoteSshCommand(target, `wc -c < ${renderedFile} 2>/dev/null || echo 0`);
        const sizeBytes = Number.parseInt(wcOut.trim().split(/\s+/)[0] || "0", 10) || 0;
        let markdownForParse = "";
        let fullMarkdown: string | null = null;
        if (sizeBytes > 0 && sizeBytes <= IMPORTED_CONTEXT_BUNDLE_MAX_FULL_READ_BYTES) {
          const { stdout: body } = await deps.runRemoteSshCommand(target, `cat ${renderedFile} 2>/dev/null || true`);
          fullMarkdown = body;
          markdownForParse = body;
        } else {
          const { stdout: chunk } = await deps.runRemoteSshCommand(
            target,
            `head -c ${IMPORTED_CONTEXT_BUNDLE_HEADER_BYTES} ${renderedFile} 2>/dev/null || true`
          );
          markdownForParse = chunk;
        }
        const relativePath = toWorkspaceRelativePath(target, projectId, abs).replace(/\\/g, "/");
        const fileName = relativePath.split("/").pop() || relativePath;
        let contentMd5: string | null = null;
        if (sizeBytes <= 0) {
          contentMd5 = md5HexOfUtf8String("");
        } else {
          const { stdout: md5Out } = await deps.runRemoteSshCommand(
            target,
            `openssl dgst -md5 ${renderedFile} 2>/dev/null || true`
          );
          contentMd5 = parseOpensslMd5Stdout(md5Out);
        }
        results.push({
          path: relativePath,
          fileName,
          sizeBytes,
          updatedAt: null,
          contentMd5,
          ...buildImportedContextBundleListMetadata(markdownForParse, {
            fullMarkdownUtf8: fullMarkdown,
            byteSize: sizeBytes
          })
        });
      }
      return results.sort((left, right) => importedContextBundleSortMs(right) - importedContextBundleSortMs(left));
    }

    const rootLocal = absoluteRoot;
    const entries = await fs.readdir(rootLocal, { withFileTypes: true }).catch(() => [] as import("node:fs").Dirent[]);
    const results: ImportedContextBundleSummary[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !/^context-bundle-.+\.md$/i.test(entry.name)) {
        continue;
      }
      const relativePath = `${NORA_IMPORTED_CONTEXT_RELATIVE}/${entry.name}`;
      const absFile = path.join(rootLocal, entry.name);
      const st = await fs.stat(absFile).catch(() => null);
      const sizeBytes = st?.size ?? 0;
      let markdownForParse = "";
      let fullMarkdown: string | null = null;
      if (sizeBytes > 0 && sizeBytes <= IMPORTED_CONTEXT_BUNDLE_MAX_FULL_READ_BYTES) {
        fullMarkdown = await fs.readFile(absFile, "utf8");
        markdownForParse = fullMarkdown;
      } else if (sizeBytes > IMPORTED_CONTEXT_BUNDLE_MAX_FULL_READ_BYTES) {
        markdownForParse = await readLocalImportedBundleHeader(absFile).catch(() => "");
      } else {
        markdownForParse = "";
      }
      const contentMd5 = await hashImportedContextBundleLocal(absFile, fullMarkdown, sizeBytes);
      results.push({
        path: relativePath,
        fileName: entry.name,
        sizeBytes,
        updatedAt: st?.mtime.toISOString() ?? null,
        contentMd5,
        ...buildImportedContextBundleListMetadata(markdownForParse, {
          fullMarkdownUtf8: fullMarkdown,
          byteSize: sizeBytes
        })
      });
    }
    return results.sort((left, right) => importedContextBundleSortMs(right) - importedContextBundleSortMs(left));
  }

  return {
    addTaskToWorkspaceTaskBoard,
    deleteWorkspaceFile,
    getDefaultTaskBoardSectionId,
    getWorkspaceImageMimeType,
    isWorkspaceNotePath,
    isWorkspaceSpecPath,
    isWorkspaceTaskPath,
    listWorkspaceNotePaths,
    listWorkspaceNotes,
    listWorkspaceSpecPaths,
    listWorkspaceSpecs,
    listWorkspaceTaskPaths,
    listWorkspaceTasks,
    listWorkspaceTrackedAndUntrackedFiles,
    listImportedContextBundles,
    listWorkspaceDirectories,
    createWorkspaceDirectory,
    moveWorkspaceFile,
    readWorkspaceBinaryFile,
    readWorkspaceSplitViewCollection,
    readWorkspaceTaskBoard,
    readWorkspaceTextFile,
    resolveExistingWorkspaceAbsolutePath,
    removeWorkspaceTaskBoardPosition,
    renameWorkspaceTaskBoardPosition,
    searchWorkspaceFiles,
    statWorkspacePath,
    writeWorkspaceSplitViewCollection,
    writeWorkspaceTaskBoard,
    writeWorkspaceBinaryFile,
    writeWorkspaceTextFile
  };
}
