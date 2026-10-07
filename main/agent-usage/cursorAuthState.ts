import os from "node:os";
import path from "node:path";
import type { SQLOutputValue } from "node:sqlite";
import { queryReadOnlySqlite } from "../helpers/readOnlySqlite";
import { getJsonObject, getNumber, getString } from "../jsonValue";
import type { CursorAuthState } from "../types/agent-usage/cursorUsage.types";

const CURSOR_AUTH_KEYS = [
  "cursorAuth/accessToken",
  "cursorAuth/cachedEmail",
  "cursorAuth/stripeMembershipType"
] as const;

/** Where the Cursor desktop app stores global state (including its sign-in) on each platform. */
export const resolveCursorStateDbPath = (
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env
): string => {
  const segments = ["Cursor", "User", "globalStorage", "state.vscdb"];
  if (platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", ...segments);
  }
  if (platform === "win32") {
    return path.join(env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), ...segments);
  }
  return path.join(env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), ...segments);
};

const decodeJwtClaims = (token: string): Record<string, unknown> | null => {
  const payload = token.split(".")[1];
  if (!payload) {
    return null;
  }
  try {
    return getJsonObject(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
  } catch {
    return null;
  }
};

/** Parses `{ key, value }` rows from Cursor's `ItemTable`. */
export const parseCursorAuthRows = (rows: Record<string, SQLOutputValue>[]): CursorAuthState | null => {
  const values = new Map(
    rows.flatMap((row) => {
      const key = getString(row.key);
      const value = getString(row.value);
      return key && value ? [[key, value] as const] : [];
    })
  );
  const accessToken = values.get("cursorAuth/accessToken");
  const claims = accessToken ? decodeJwtClaims(accessToken) : null;
  const userId = getString(claims?.sub)?.split("|").pop();
  if (!accessToken || !userId) {
    return null;
  }
  const expSeconds = getNumber(claims?.exp);
  return {
    accessToken,
    userId,
    expiresAtMs: expSeconds !== null ? expSeconds * 1000 : null,
    email: values.get("cursorAuth/cachedEmail") ?? null,
    membershipType: values.get("cursorAuth/stripeMembershipType") ?? null
  };
};

export const readCursorAuthState = (stateDbPath: string): CursorAuthState | null => {
  const placeholders = CURSOR_AUTH_KEYS.map(() => "?").join(", ");
  const rows = queryReadOnlySqlite(
    stateDbPath,
    `SELECT key, value FROM ItemTable WHERE key IN (${placeholders})`,
    [...CURSOR_AUTH_KEYS]
  );
  return rows ? parseCursorAuthRows(rows) : null;
};
