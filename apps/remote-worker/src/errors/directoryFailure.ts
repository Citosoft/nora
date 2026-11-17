import type { DirectoryErrorCode } from "@shared/types/remote-access/directory.types";

/** An expected, client-facing failure. The message is returned verbatim, so it must never contain secrets. */
export class DirectoryFailure extends Error {
  readonly code: DirectoryErrorCode;

  constructor(code: DirectoryErrorCode, message: string) {
    super(message);
    this.name = "DirectoryFailure";
    this.code = code;
  }
}
