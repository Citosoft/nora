import { z } from "zod";
import { appActionResultSchema, appActionRunSchema, appActivityEntrySchema, appDefinitionSchema, appIdSchema, appRenderDataSchema, appSourceInputsSchema, appSummarySchema, appVersionSchema } from "./contracts";
import { connectorIdSchema } from "@shared/connectors/contracts";
import { isDirectoryAppId } from "./installLink";
import { appFileSchema } from "./portable";

const workspaceId = z.string().min(1).max(512);

export const appsInstallRequestedChannel = "apps:install-requested";
export const appsChannel = "apps:request";
/** Pushed with every app's summary whenever one is created, renamed, edited, trusted or deleted. */
export const appsChangedChannel = "apps:changed";
/** Pushed with one app's render data whenever a source finishes loading or fails. */
export const appsDataChannel = "apps:data";
/** Pushed as a builder thread's tools make progress, so the window can narrate the build. */
export const appsBuildingChannel = "apps:building";

export const appsRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("get-install-request") }).strict(),
  z.object({ kind: z.literal("clear-install-request"), id: z.string().refine(isDirectoryAppId) }).strict(),
  z.object({ kind: z.literal("read-directory-app"), id: z.string().refine(isDirectoryAppId) }).strict(),
  z.object({ kind: z.literal("list") }).strict(),
  z.object({ kind: z.literal("get"), id: appIdSchema }).strict(),
  z.object({ kind: z.literal("rename"), id: appIdSchema, name: z.string().trim().min(1).max(120) }).strict(),
  z.object({ kind: z.literal("set-trusted"), id: appIdSchema, trusted: z.boolean() }).strict(),
  z.object({ kind: z.literal("move-panel"), id: appIdSchema, version: z.number().int().min(1),
    panelId: z.string().min(1).max(512), targetId: z.string().min(1).max(512), placement: z.enum(["before", "after"]) }).strict(),
  z.object({ kind: z.literal("delete"), id: appIdSchema }).strict(),
  /** Reloads every source, or only the ids given, with the window's current values for bound arguments; the result arrives on the data channel. */
  z.object({ kind: z.literal("refresh"), id: appIdSchema, sourceIds: z.array(z.string().min(1)).optional(), inputs: appSourceInputsSchema.optional() }).strict(),
  z.object({ kind: z.literal("run-action"), run: appActionRunSchema }).strict(),
  /** Appends the next page of a paged source; the result arrives like a refresh. */
  z.object({ kind: z.literal("load-more"), id: appIdSchema, sourceId: z.string().min(1) }).strict(),
  z.object({ kind: z.literal("list-versions"), id: appIdSchema }).strict(),
  /** The newest actions the app ran, most recent first. */
  z.object({ kind: z.literal("list-activity"), id: appIdSchema }).strict(),
  z.object({ kind: z.literal("restore-version"), id: appIdSchema, version: z.number().int().min(1) }).strict(),
  /** While watched, an app's interval sources keep refreshing and its data is pushed; unwatch when its view closes. */
  z.object({ kind: z.literal("watch"), id: appIdSchema }).strict(),
  z.object({ kind: z.literal("unwatch"), id: appIdSchema }).strict(),
  /** Saves the app as a file the user chooses; replies `exported`, or `done` when they cancel. */
  z.object({ kind: z.literal("export"), id: appIdSchema }).strict(),
  /** Lets the user pick an app file and reads it; replies `app-file`, or `done` when they cancel. */
  z.object({ kind: z.literal("pick-import") }).strict(),
  /** Saves a picked file as a new app, with each of its connectors replaced by the local one chosen for it. */
  z.object({ kind: z.literal("import"), workspaceId, file: appFileSchema, connectorIds: z.record(connectorIdSchema, connectorIdSchema) }).strict()
]);
export const appsReplyValueSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("install-request"), id: z.string().nullable() }).strict(),
  z.object({ kind: z.literal("apps"), apps: z.array(appSummarySchema) }).strict(),
  z.object({ kind: z.literal("app"), app: appDefinitionSchema, data: appRenderDataSchema }).strict(),
  z.object({ kind: z.literal("data"), data: appRenderDataSchema }).strict(),
  z.object({ kind: z.literal("action"), result: appActionResultSchema }).strict(),
  z.object({ kind: z.literal("versions"), versions: z.array(appVersionSchema) }).strict(),
  z.object({ kind: z.literal("activity"), entries: z.array(appActivityEntrySchema) }).strict(),
  z.object({ kind: z.literal("exported"), path: z.string().min(1) }).strict(),
  z.object({ kind: z.literal("app-file"), path: z.string().min(1), file: appFileSchema }).strict(),
  z.object({ kind: z.literal("done") }).strict()
]);
export const appsReplySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), value: appsReplyValueSchema }).strict(),
  z.object({ ok: z.literal(false), message: z.string().min(1) }).strict()
]);
