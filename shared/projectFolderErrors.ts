/** Shared between main (which throws it) and renderer (which offers to remove the project). */
const MISSING_PROJECT_FOLDER_MESSAGE = "The project folder no longer exists";

export function createMissingProjectFolderError(rootPath: string): Error {
  return new Error(`${MISSING_PROJECT_FOLDER_MESSAGE}: ${rootPath}`);
}

/** Matches by substring because IPC prefixes rethrown errors with the channel name. */
export function isMissingProjectFolderError(error: unknown): error is Error {
  return error instanceof Error && error.message.includes(MISSING_PROJECT_FOLDER_MESSAGE);
}
