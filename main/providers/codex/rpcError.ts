/** Preserve protocol rejection categories without exposing provider diagnostics. */
export class CodexRpcError extends Error {
  readonly invalidParameters: boolean;
  constructor(readonly code: number, diagnostic: string) {
    super(`Codex RPC failed (${code})`);
    this.name = "CodexRpcError";
    this.invalidParameters = code === -32602 || (code === -32600 && /missing field [`'"](?:threadId|input|expectedTurnId)[`'"]/.test(diagnostic));
  }
}
