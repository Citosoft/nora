import fs from "node:fs/promises";
import path from "node:path";

/**
 * Plain (non-git) folders have no ignore rules to lean on, so file listing and search skip
 * dependency and cache directories that would otherwise flood the file tree and search results.
 */
export const UNVERSIONED_WORKSPACE_IGNORED_DIRECTORIES = [
  ".git",
  "node_modules",
  ".venv",
  "__pycache__",
  ".next",
  ".turbo",
  ".cache"
] as const;

/** Caps listing so opening a very large plain folder (for example a home directory) stays responsive. */
export const UNVERSIONED_WORKSPACE_FILE_LIMIT = 50_000;

const ignoredDirectoryNames = new Set<string>(UNVERSIONED_WORKSPACE_IGNORED_DIRECTORIES);

export async function walkLocalWorkspaceFiles(
  rootPath: string,
  limit = UNVERSIONED_WORKSPACE_FILE_LIMIT
): Promise<string[]> {
  const filePaths: string[] = [];
  const pendingDirectories: string[] = [""];

  while (pendingDirectories.length && filePaths.length < limit) {
    const relativeDirectoryPath = pendingDirectories.shift() ?? "";
    const entries = await fs.readdir(path.join(rootPath, relativeDirectoryPath), { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const relativePath = relativeDirectoryPath ? `${relativeDirectoryPath}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!ignoredDirectoryNames.has(entry.name)) {
          pendingDirectories.push(relativePath);
        }
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        filePaths.push(relativePath);
        if (filePaths.length >= limit) {
          break;
        }
      }
    }
  }

  return filePaths;
}

/** `find` command listing files under an already shell-rendered remote root, one absolute path per line. */
export function buildRemoteWorkspaceFileFindCommand(renderedRoot: string): string {
  const prunedNames = UNVERSIONED_WORKSPACE_IGNORED_DIRECTORIES.map((name) => `-name '${name}'`).join(" -o ");
  return `if [ -d ${renderedRoot} ]; then find ${renderedRoot} -type d \\( ${prunedNames} \\) -prune -o \\( -type f -o -type l \\) -print | head -n ${UNVERSIONED_WORKSPACE_FILE_LIMIT}; fi`;
}

/** Pathspecs that keep `git grep --no-index` out of the same directories the listing skips. */
export function buildUnversionedGrepPathspecs(): string[] {
  return [".", ...UNVERSIONED_WORKSPACE_IGNORED_DIRECTORIES.map((name) => `:(exclude,glob)**/${name}/**`)];
}
