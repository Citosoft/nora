import type { AppSourceErrorKind } from "@shared/types/apps/apps.types";

/** A connector call that failed for a reason the UI can act on: sign in, turn the connector back on, or fix the app. */
export class ConnectorToolError extends Error {
  constructor(readonly kind: Exclude<AppSourceErrorKind, "select-failed">, message: string) {
    super(message);
    this.name = "ConnectorToolError";
  }
}
