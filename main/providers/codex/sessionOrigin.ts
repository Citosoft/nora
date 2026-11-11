import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { z } from "zod";
import type { CodexSessionSource } from "@main/types/execution/externalSessions.types";
import type { ExternalSession } from "@shared/types/conversation/externalSessions.types";

const headerSchema = z.object({ type: z.literal("session_meta"), payload: z.object({ originator: z.string().optional() }) });
const isDesktop = (originator: string): boolean => /codex[ _-]?(?:desktop|app)|openai[ _-]?desktop/i.test(originator);

/** Some desktop versions persist the IDE source kind; inspect only the session header to distinguish them. */
export async function codexSessionOrigin(entry: CodexSessionSource): Promise<ExternalSession["origin"] | null> {
  if (entry.originator && isDesktop(entry.originator)) return "desktop";
  if (entry.source === "appServer") return "desktop";
  if (entry.path) {
    const stream = createReadStream(entry.path, { encoding: "utf8" });
    const lines = createInterface({ input: stream, crlfDelay: Infinity });
    try {
      for await (const line of lines) {
        const parsed = headerSchema.safeParse(JSON.parse(line));
        if (parsed.success && parsed.data.payload.originator && isDesktop(parsed.data.payload.originator)) return "desktop";
        break;
      }
    } catch { /* A missing header does not prevent CLI discovery through the app-server metadata. */ }
    finally { lines.close(); stream.destroy(); }
  }
  return !entry.source || entry.source === "cli" ? "cli" : null;
}
