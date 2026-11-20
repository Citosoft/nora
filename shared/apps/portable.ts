import { z } from "zod";
import { connectorIdSchema, connectorUrlSchema } from "@shared/connectors/contracts";
import { appSpecInputSchema } from "./contracts";
import { appIconSchema } from "./icons";
import type { AppDefinition, AppSpec, AppSpecInput } from "@shared/types/apps/apps.types";
import type { AppFile, AppFileConnectorMatches } from "@shared/types/apps/portable.types";
import type { Connector } from "@shared/types/connectors/connectors.types";

export const APP_FILE_FORMAT = "nora-app";
export const APP_FILE_EXTENSION = "nora-app.json";

export const appFileConnectorSchema = z.object({
  name: z.string().trim().min(1).max(80), url: z.string().max(2048),
  /** Only portable authentication hints; keys, tokens and OAuth client credentials stay on the sender's computer. */
  auth: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("oauth"), customClient: z.boolean() }).strict(),
    z.object({ kind: z.literal("header"), name: z.string().min(1).max(128) }).strict()
  ]).optional()
}).strict();
/** Credentials never leave with an app: the file names the connectors' servers and another Nora signs in with its own accounts. */
export const appFileSchema = z.object({
  format: z.literal(APP_FILE_FORMAT),
  formatVersion: z.literal(1),
  name: z.string().trim().min(1).max(120),
  icon: appIconSchema.optional(),
  exportedAt: z.string().datetime(),
  connectors: z.record(connectorIdSchema, appFileConnectorSchema),
  spec: appSpecInputSchema
}).strict();

/** Every connector a spec reaches, through its sources and actions. */
export const appSpecConnectorIds = (spec: Pick<AppSpec, "sources" | "actions">): string[] =>
  [...new Set([...Object.values(spec.sources).flatMap((source) => source.kind === "connector" ? [source.connectorId] : []), ...Object.values(spec.actions).map((action) => action.connectorId)])];

/** Builds the file for an app; a connector the app uses but that is no longer available is still named by id so the import can ask for it. */
export function exportAppFile(app: AppDefinition, connectors: readonly Connector[], exportedAt: string): AppFile {
  const described: AppFile["connectors"] = {};
  for (const id of appSpecConnectorIds(app.spec)) {
    const connector = connectors.find((entry) => entry.id === id);
    described[id] = connector ? { name: connector.name, url: connector.url, auth: connector.auth.kind === "header" ? { kind: "header", name: connector.auth.name } : { kind: "oauth", customClient: connector.auth.customClient } } : { name: `Connector ${id.slice(0, 8)}`, url: "" };
  }
  return { format: APP_FILE_FORMAT, formatVersion: 1, name: app.name, icon: app.icon, exportedAt, connectors: described, spec: app.spec };
}

/** URL hosts are case insensitive; MCP paths and query values are not. */
const serverKey = (value: string): string => {
  try { const url = new URL(value); url.pathname = url.pathname.replace(/\/+$/, ""); return url.href; }
  catch { return value.trim(); }
};

/** Legacy files did not record authentication, so they still ask the user to configure missing connectors. */
export const canInstallAppConnector = (connector: AppFile["connectors"][string]): boolean =>
  connectorUrlSchema.safeParse(connector.url).success && connector.auth?.kind === "oauth" && !connector.auth.customClient;

/** Local connectors that can stand in for one the file names: those serving the same URL, or any when a legacy file recorded none. */
export const appFileConnectorCandidates = (described: AppFile["connectors"][string], available: readonly Connector[]): Connector[] =>
  described.url ? available.filter((entry) => serverKey(entry.url) === serverKey(described.url)) : [...available];

/** Pairs each connector the file names with a local one serving the same URL; the local id itself wins when it still exists here. */
export function matchAppFileConnectors(file: AppFile, available: readonly Connector[]): AppFileConnectorMatches {
  const matches: AppFileConnectorMatches = {};
  for (const [id, described] of Object.entries(file.connectors)) {
    const candidates = appFileConnectorCandidates(described, available);
    const same = candidates.find((entry) => entry.id === id) ?? (described.url ? candidates[0] : undefined);
    matches[id] = same?.id ?? null;
  }
  return matches;
}

/** The file's spec with every connector id replaced by the local one chosen for it; unmapped ids are left for validation to report. */
export function rebindAppFileSpec(spec: AppSpecInput, connectorIds: Readonly<Record<string, string>>): AppSpecInput {
  const rebind = <T extends { connectorId: string }>(entry: T): T => ({ ...entry, connectorId: connectorIds[entry.connectorId] ?? entry.connectorId });
  return { ...spec,
    sources: Object.fromEntries(Object.entries(spec.sources).map(([key, source]) => [key, source.kind === "connector" ? rebind(source) : source])),
    actions: Object.fromEntries(Object.entries(spec.actions).map(([key, action]) => [key, rebind(action)])) };
}

/** A file name for the export, safe on every platform. */
export const appFileName = (appName: string): string => `${appName.replace(/[\\/:*?"<>|]+/g, " ").trim().replace(/\s+/g, "-") || "app"}.${APP_FILE_EXTENSION}`;
