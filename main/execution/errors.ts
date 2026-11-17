export class ExecutionCommandError extends Error {
  constructor(readonly code: "missing" | "conflict" | "expired" | "invalid" | "cursor" | "environment" | "unavailable", message: string) {
    super(message);
    this.name = "ExecutionCommandError";
  }
}
