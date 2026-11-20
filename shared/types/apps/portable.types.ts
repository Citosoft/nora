import type { z } from "zod";
import type { appFileConnectorSchema, appFileSchema } from "@shared/apps/portable";

/** A connector an exported app relies on, described so another Nora can find or add its own. */
export type AppFileConnector = z.infer<typeof appFileConnectorSchema>;
/** An app as a file: its name and spec, with the connectors it uses described by name and server URL rather than by local id. */
export type AppFile = z.infer<typeof appFileSchema>;

/** The connector id in the file → the local connector with the same server, or null when none was found. */
export type AppFileConnectorMatches = Record<string, string | null>;
/** A file the user picked, read by main. */
export interface PickedAppFile { path: string; file: AppFile; }
