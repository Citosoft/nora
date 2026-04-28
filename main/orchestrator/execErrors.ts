export const getExecStdout = (error: unknown): string => {
  if (error && typeof error === "object" && "stdout" in error && typeof error.stdout === "string") {
    return error.stdout;
  }
  return "";
};

export const getExecStderr = (error: unknown): string => {
  if (error && typeof error === "object" && "stderr" in error && typeof error.stderr === "string") {
    return error.stderr;
  }
  return "";
};

export const isExecTimeoutError = (error: unknown): error is NodeJS.ErrnoException =>
  error !== null &&
  typeof error === "object" &&
  (("code" in error && error.code === "ETIMEDOUT") || ("killed" in error && error.killed === true));

export const describeGitTimeout = (operation: string): string =>
  `${operation} timed out for this workspace. The workspace opened, but git change data is currently unavailable.`;

export const titleCase = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);
