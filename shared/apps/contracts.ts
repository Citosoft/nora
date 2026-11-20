import { z } from "zod";
import { connectorIdSchema } from "@shared/connectors/contracts";
import { appIconSchema, DEFAULT_APP_ICON } from "./icons";
import { appCatalog } from "./catalog";

/** Rows kept per source after shaping; larger results are cut and flagged so the window never receives an unbounded payload. */
export const APP_SOURCE_ROW_LIMIT = 500;
/** Bytes of a raw tool result kept as the sample `select` expressions are checked against. */
export const APP_SAMPLE_MAX_BYTES = 64 * 1024;
export const APP_SOURCE_MIN_INTERVAL_SECONDS = 30;

export const appIdSchema = z.string().min(1).max(128);
const key = z.string().trim().min(1).max(64).regex(/^[A-Za-z][A-Za-z0-9_-]*$/, "Use a short identifier (letters, digits, _ or -)");
const time = z.string().datetime();

export const appSourceRefreshSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("open") }).strict(),
  /** `background` keeps the source refreshing while the app is closed, so its alerts can fire; otherwise it ticks only on screen. */
  z.object({ kind: z.literal("interval"), seconds: z.number().int().min(APP_SOURCE_MIN_INTERVAL_SECONDS).max(86_400), background: z.boolean().default(false) }).strict()
]);
/** A source argument read from app state when the source loads, so inputs bound to that path drive the call. */
export const appStateBindingSchema = z.object({ $state: z.string().min(1).max(512).regex(/^\//, "State paths start with /") }).strict();
/** Written into the spec, or read from app state; the binding is tried first because any JSON would also match a literal. */
export const appSourceArgSchema = z.union([appStateBindingSchema, z.json()]);
/** JSONata over what the source read (a tool's structured content or its text parsed as JSON; a file's rows or JSON). */
const select = z.string().trim().min(1).max(4_000);
/** How a tool pages, so the app can ask for the next page: by an offset argument, or by a cursor the previous result carries. */
export const appSourcePageSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("offset"), arg: z.string().min(1).max(128).describe("Argument that receives how many rows were already loaded"),
    size: z.number().int().min(1).max(APP_SOURCE_ROW_LIMIT).describe("Rows per page, matching the limit passed in args; a shorter page means the end") }).strict(),
  z.object({ kind: z.literal("cursor"), arg: z.string().min(1).max(128).describe("Argument that receives the cursor"),
    next: z.string().trim().min(1).max(1_000).describe("JSONata over the raw result giving the next cursor; empty or null means the end") }).strict()
]);
/** Rows an app may hold for one source across pages. */
export const APP_SOURCE_PAGED_ROW_LIMIT = 5_000;
/** One connector tool call whose result, shaped by `select`, becomes rows the UI reads at `/sources/<id>`. */
export const appConnectorSourceSchema = z.object({
  kind: z.literal("connector"),
  connectorId: connectorIdSchema,
  tool: z.string().min(1).max(256),
  args: z.record(z.string(), appSourceArgSchema).default({}),
  select,
  page: appSourcePageSchema.optional(),
  refresh: appSourceRefreshSchema.default({ kind: "open" })
}).strict();
/** A CSV, TSV or JSON file on this computer, read as rows (CSV and TSV: one object per line, headed by the first line) or as its JSON value, and re-read when it changes. */
export const appFileSourceSchema = z.object({
  kind: z.literal("file"),
  /** Absolute, or under the home folder with a leading ~. */
  path: z.string().trim().min(1).max(1024),
  select,
  refresh: appSourceRefreshSchema.default({ kind: "open" })
}).strict();
const withSourceKind = (value: unknown): unknown => value && typeof value === "object" && !Array.isArray(value) && !("kind" in value) ? { ...value, kind: "connector" } : value;
/** Sources written before files existed carry no kind and read as connector sources. */
export const appSourceSchema = z.preprocess(withSourceKind, z.discriminatedUnion("kind", [appConnectorSourceSchema, appFileSourceSchema]));
export const APP_FILE_SOURCE_EXTENSIONS = ["csv", "tsv", "json"] as const;

/** Where an action argument comes from when it runs: written into the spec, read from app state, or taken from the clicked row. */
export const appArgBindingSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("literal"), value: z.json() }).strict(),
  z.object({ kind: z.literal("state"), path: z.string().min(1).max(512).regex(/^\//, "State paths start with /") }).strict(),
  z.object({ kind: z.literal("item"), field: z.string().min(1).max(256) }).strict()
]);
/** A connector tool call a Button or row runs; writes confirm first unless the app is trusted. */
export const appActionSchema = z.object({
  connectorId: connectorIdSchema,
  tool: z.string().min(1).max(256),
  args: z.record(z.string(), appArgBindingSchema).default({}),
  /** Shown on the confirm sheet in place of the generic text. */
  confirm: z.string().trim().min(1).max(500).optional(),
  refreshSources: z.array(key).max(50).default([])
}).strict();

/**
 * A condition over a source's rows that lands in the Inbox when it becomes true. `title` and `detail` are templates whose
 * `${…}` parts are JSONata over the same rows; `key` tells one occurrence from the next (default: the title), so the alert fires
 * again only when what it reports changes.
 */
export const appAlertSchema = z.object({
  source: key,
  when: z.string().trim().min(1).max(2_000),
  title: z.string().trim().min(1).max(300),
  detail: z.string().trim().max(1_000).optional(),
  key: z.string().trim().min(1).max(500).optional(),
  /** needs-you stays in the Inbox until the condition clears; update can be read and marked done. */
  tier: z.enum(["needs-you", "update"]).default("update")
}).strict();

export const appUiSpecSchema = appCatalog.zodSchema();
export const appSpecSchema = z.object({
  sources: z.record(key, appSourceSchema).default({}),
  actions: z.record(key, appActionSchema).default({}),
  alerts: z.record(key, appAlertSchema).default({}),
  ui: appUiSpecSchema
}).strict();

export const appSuggestionsSchema = z.array(z.string().trim().min(1).max(120)).max(3).default([]);
export const appDefinitionSchema = z.object({
  id: appIdSchema,
  name: z.string().trim().min(1).max(120),
  /** The workspace the app was built in: its connectors are the ones the app may use, and its builder thread runs there. */
  workspaceId: z.string().min(1).max(512),
  /** The builder thread that owns this app; its agent edits the spec. */
  threadId: z.string().min(1).max(512).nullable(),
  /** Writes run without the confirm sheet. */
  trusted: z.boolean(),
  version: z.number().int().min(1),
  /** Next changes the builder thinks the user may want, offered as one-click requests under the app. */
  suggestions: appSuggestionsSchema,
  /** Chosen by the builder to say what the app is for; apps saved before icons existed get the generic one. */
  icon: appIconSchema.default(DEFAULT_APP_ICON),
  createdAt: time,
  updatedAt: time,
  spec: appSpecSchema
}).strict();
/** An app without its spec, for lists; it keeps the connectors the spec reaches so a list can show them without loading every spec. */
export const appSummarySchema = appDefinitionSchema.omit({ spec: true }).extend({ connectorIds: z.array(connectorIdSchema) });
export const appVersionSchema = z.object({ version: z.number().int().min(1), createdAt: time, summary: z.string().max(500) }).strict();

export const appSourceErrorKindSchema = z.enum(["needs-auth", "unavailable", "tool-failed", "select-failed"]);
export const appSourceStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("idle") }).strict(),
  z.object({ status: z.literal("loading"), fetchedAt: time.optional() }).strict(),
  /** `hasMore` is true when the source pages and the tool has rows beyond those loaded. */
  z.object({ status: z.literal("ready"), fetchedAt: time, truncated: z.boolean(), hasMore: z.boolean().default(false) }).strict(),
  z.object({ status: z.literal("error"), kind: appSourceErrorKindSchema, message: z.string().min(1), fetchedAt: time.optional() }).strict()
]);
/** What the window holds for one app: shaped rows per source and each source's state, never the raw tool result. */
export const appRenderDataSchema = z.object({
  appId: appIdSchema,
  sources: z.record(key, z.json()),
  sourceStates: z.record(key, appSourceStateSchema)
}).strict();

export const appActionResultSchema = z.object({ message: z.string().min(1), isError: z.boolean() }).strict();
/** One action the app ran, kept so anyone can see what a tool did to real data and when. */
export const appActivityEntrySchema = z.object({
  id: z.number().int().min(1),
  at: time,
  actionId: key,
  tool: z.string().min(1),
  connectorName: z.string().min(1),
  args: z.record(z.string(), z.json()),
  /** True when the user confirmed the action in the sheet; false when the app is trusted and it ran at once. */
  confirmed: z.boolean(),
  ok: z.boolean(),
  /** What the tool said, in full (bounded), where the toast shows a summary. */
  message: z.string()
}).strict();
/** What the builder is doing, as its tools report it, so the window can narrate a build without showing the thread. */
export const appBuildStepSchema = z.object({
  threadId: z.string().min(1).max(512),
  kind: z.enum(["connectors", "sample", "save", "saved"]),
  /** The connector or tool being looked at, or the app's name once saved. */
  detail: z.string().max(200).optional(),
  at: time
}).strict();
export const appActionRunSchema = z.object({ appId: appIdSchema, actionId: key, args: z.record(z.string(), z.json()), confirmed: z.boolean().default(true) }).strict();

/** `spec` from the agent is accepted loosely so validation can report every problem in one reply rather than failing on the first. */
export const appSpecInputSchema = z.object({ sources: z.record(key, appSourceSchema).default({}), actions: z.record(key, appActionSchema).default({}), alerts: z.record(key, appAlertSchema).default({}),
  ui: z.object({ root: z.string().min(1), elements: z.record(z.string().min(1), z.unknown()), state: z.record(z.string(), z.json()).optional() }).strict() }).strict();
/** The values the window resolved for a source's bound arguments, keyed by source then argument name. */
export const appSourceInputsSchema = z.record(key, z.record(z.string(), z.json()));
