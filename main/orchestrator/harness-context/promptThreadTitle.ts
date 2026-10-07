import { normalizeThreadTitle } from "../agentSessionTitles";

/** Harnesses (e.g. Cursor) wrap the typed prompt in `<user_query>` alongside injected metadata blocks. */
const USER_QUERY_PATTERN = /<user_query>([\s\S]*?)<\/user_query>/i;
/** Injected metadata such as `<timestamp>…</timestamp>` or `<system_reminder>…</system_reminder>`. */
const METADATA_BLOCK_PATTERN = /<([a-z][a-z0-9_-]*)>[\s\S]*?<\/\1>/gi;

/** Derives a readable thread title from a raw user prompt, ignoring harness-injected wrappers. */
export const buildPromptThreadTitle = (prompt: string): string | null => {
  const userQuery = USER_QUERY_PATTERN.exec(prompt)?.[1];
  if (userQuery !== undefined) {
    return normalizeThreadTitle(userQuery);
  }
  return normalizeThreadTitle(prompt.replace(METADATA_BLOCK_PATTERN, " "));
};
