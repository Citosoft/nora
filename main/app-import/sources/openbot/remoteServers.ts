import path from "node:path";
import { z } from "zod";
import type { AppImportEnvironment } from "@main/types/app-import/appImportSource.types";
import { readJsonFile } from "@main/app-import/fileSystem";
import { OPENBOT_REMOTE_SERVERS, openBotDataDirectory } from "./paths";

/** Only the active server's id and name are read; addresses, usernames and keys stay behind. */
const remoteServersSchema = z.object({
  activeServerId: z.string().nullish(),
  servers: z.array(z.object({ id: z.string(), name: z.string().max(200).optional() }).passthrough()).catch([])
}).passthrough();

/**
 * The name of the server OpenBot on this computer is connected to, or null when it runs only locally. A server
 * keeps its bots in its own database, so they don't appear in the local one.
 */
export async function activeOpenBotServerName(env: AppImportEnvironment): Promise<string | null> {
  const file = await readJsonFile(path.join(openBotDataDirectory(env), OPENBOT_REMOTE_SERVERS));
  if (file.status !== "ok") return null;
  const parsed = remoteServersSchema.safeParse(file.value);
  if (!parsed.success || !parsed.data.activeServerId) return null;
  const server = parsed.data.servers.find((entry) => entry.id === parsed.data.activeServerId);
  if (!server) return null;
  return server.name?.trim() || "an OpenBot server";
}
