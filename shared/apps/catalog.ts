import { z } from "zod";
import { defineCatalog, defineSchema } from "@json-render/core";
import { dynamic } from "./expressions";

/**
 * The components and actions an app's UI may be built from. The agent only ever emits these; main validates every spec against them
 * and the window renders each with a Nora component. Keep this small: every entry is described to the model on every builder turn.
 */
const text = dynamic(z.string());
const optionalText = dynamic(z.string()).optional();
const rows = z.object({ $state: z.string().min(1) }).strict().describe("Rows read from a source: { \"$state\": \"/sources/<sourceId>\" }");
export const appValueFormatSchema = z.enum(["text", "number", "currency", "percent", "date", "datetime", "relative"]);
const columnSchema = z.object({
  key: z.string().min(1).describe("Field name on each row"),
  label: z.string().min(1),
  format: appValueFormatSchema.optional().describe("How to show the value; numbers right-align"),
  currency: z.string().length(3).optional().describe("ISO currency code for the currency format, e.g. USD"),
  editable: z.boolean().optional().describe("The cell can be edited in place; the Table's editAction then runs with the changed row")
}).strict();
const field = z.string().min(1);
const sourceStatus = z.string().min(1).optional().describe("Source id whose loading and error state this component shows");
const selectPath = z.string().min(1).regex(/^\//).optional().describe("State path the clicked row is written to, e.g. /selected/contact; a Record or Card with visible on that path then shows it");

/** The json-render element tree (`root` + flat `elements` keyed by id); identical to its React renderer's schema, without React. */
export const appUiSchema = defineSchema((s) => ({
  spec: s.object({
    root: s.string(),
    elements: s.record(s.object({
      type: s.ref("catalog.components"),
      props: s.propsOf("catalog.components"),
      children: s.array(s.string()),
      visible: { ...s.any(), optional: true },
      repeat: { ...s.any(), optional: true },
      on: { ...s.any(), optional: true }
    })),
    /** Initial app state, e.g. default filter values that bound source arguments read. */
    state: { ...s.record(s.any()), optional: true }
  }),
  catalog: s.object({
    components: s.map({ props: s.zod(), slots: s.array(s.string()), description: s.string() }),
    actions: s.map({ params: s.zod(), description: s.string() })
  })
}));

export const appCatalog = defineCatalog(appUiSchema, {
  components: {
    Grid: { props: z.object({ columns: z.number().int().min(1).max(4).default(2).describe("Equal columns; children fill left to right") }).strict(),
      slots: ["default"], description: "Responsive grid of equal columns for laying out cards side by side" },
    Stack: { props: z.object({ direction: z.enum(["column", "row"]).default("column"), gap: z.enum(["sm", "md", "lg"]).default("md") }).strict(),
      slots: ["default"], description: "Vertical or horizontal stack of children" },
    Card: { props: z.object({ title: optionalText, description: optionalText, source: sourceStatus }).strict(),
      slots: ["default"], description: "Bordered panel with an optional heading; when `source` is set it shows that source's loading or error state over its content" },
    Tabs: { props: z.object({ tabs: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) }).strict()).min(2).max(8),
      selectPath: z.string().min(1).regex(/^\//).optional().describe("State path the chosen tab id is written to, so other elements can depend on it") }).strict(),
      slots: ["default"], description: "Tabbed views: the nth child is the nth tab's content and only the chosen tab renders. Use it for a tool with several screens instead of visible conditions" },
    Heading: { props: z.object({ text, level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2) }).strict(), slots: [], description: "Section heading" },
    Text: { props: z.object({ markdown: text, muted: z.boolean().default(false) }).strict(), slots: [], description: "Paragraph of Markdown text" },
    Badge: { props: z.object({ text, tone: dynamic(z.enum(["neutral", "info", "success", "warning", "danger"])).default("neutral") }).strict(),
      slots: [], description: "Small status pill" },
    Image: { props: z.object({ src: text.describe("An https URL (or data URL), often from a row field"), alt: text, height: z.number().int().min(24).max(800).default(160),
      fit: z.enum(["cover", "contain"]).default("cover") }).strict(), slots: [], description: "A picture: a product photo, an avatar, a chart image from a tool" },
    Link: { props: z.object({ href: text.describe("An https URL, often from a row field"), label: text }).strict(), slots: [], description: "Opens a web page in the browser, e.g. the record in the connected service" },
    Metric: { props: z.object({ label: text, value: dynamic(z.union([z.string(), z.number(), z.null()])), format: appValueFormatSchema.default("text"),
      currency: z.string().length(3).optional(), hint: optionalText }).strict(), slots: [], description: "One big number with a label, e.g. open invoices total" },
    Table: { props: z.object({ rows, columns: z.array(columnSchema).min(1).max(12), rowAction: z.string().min(1).optional().describe("Action id to run with the clicked row as its item"),
      editAction: z.string().min(1).optional().describe("Action id run when an editable cell changes, with the row (edited field updated) as its item"),
      selectPath, pageSize: z.number().int().min(5).max(500).optional().describe("Rows shown before a Show more button; leave unset to show them all"),
      emptyText: z.string().default("Nothing to show.") }).strict(), slots: [],
      description: "Data table over a source's rows with sticky headings; the first column is emphasised. With selectPath, clicking a row selects it; columns marked editable save through editAction" },
    Kanban: { props: z.object({ rows, groupBy: field.describe("Field whose value places a row in a column, e.g. status"),
      columns: z.array(z.object({ value: z.string(), label: z.string().min(1) }).strict()).min(2).max(8).describe("One column per groupBy value, in order"),
      title: field.describe("Field shown as each card's title"), subtitle: field.optional(), meta: field.optional().describe("Field shown small on the card"), metaFormat: appValueFormatSchema.optional(),
      moveAction: z.string().min(1).optional().describe("Action id run when a card is dragged to another column, with the row (groupBy field set to the new value) as its item"),
      selectPath, emptyText: z.string().default("Nothing here.") }).strict(), slots: [],
      description: "Board of cards in columns by a field's value (status, stage, owner). With moveAction, cards drag between columns and the action writes the change back" },
    List: { props: z.object({ rows, title: z.string().min(1).describe("Field shown as each item's title"), subtitle: z.string().min(1).optional().describe("Field shown under the title"),
      meta: z.string().min(1).optional().describe("Field shown on the right"), metaFormat: appValueFormatSchema.optional(), rowAction: z.string().min(1).optional(), selectPath,
      pageSize: z.number().int().min(5).max(500).optional().describe("Items shown before a Show more button; leave unset to show them all"),
      emptyText: z.string().default("Nothing to show.") }).strict(), slots: [], description: "Compact list of a source's rows: title, subtitle and a right-aligned value. With selectPath, clicking an item selects it" },
    Record: { props: z.object({ item: z.object({ $state: z.string().min(1) }).strict().describe("The object to show, e.g. { \"$state\": \"/selected/contact\" } or a detail source's single row"),
      fields: z.array(columnSchema).min(1).max(30), emptyText: z.string().default("Nothing selected.") }).strict(), slots: [], description: "One record's fields as labelled values; shows emptyText until the object exists" },
    Calendar: { props: z.object({ rows, dateKey: field.describe("Field holding each row's date or datetime"), title: field.describe("Field shown on the day"), subtitle: field.optional(),
      rowAction: z.string().min(1).optional(), selectPath, emptyText: z.string().default("Nothing scheduled.") }).strict(), slots: [],
      description: "A month grid with each row on its day; the user moves between months. With selectPath, clicking an entry selects its row" },
    Timeline: { props: z.object({ rows, dateKey: field.describe("Field holding each row's date or datetime"), title: field, subtitle: field.optional(), meta: field.optional(), metaFormat: appValueFormatSchema.optional(),
      order: z.enum(["newest", "oldest"]).default("newest"), rowAction: z.string().min(1).optional(), selectPath, emptyText: z.string().default("Nothing yet.") }).strict(), slots: [],
      description: "Rows in date order down a line, grouped by day: activity, history, upcoming deadlines. With selectPath, clicking an entry selects its row" },
    Chart: { props: z.object({ rows, type: z.enum(["bar", "line", "pie"]), xKey: z.string().min(1).describe("Field for categories or the x axis"),
      series: z.array(z.object({ key: z.string().min(1), label: z.string().min(1) }).strict()).min(1).max(6), format: appValueFormatSchema.default("number"),
      currency: z.string().length(3).optional(), height: z.number().int().min(160).max(600).default(260) }).strict(), slots: [], description: "Bar, line or pie chart over a source's rows" },
    Form: { props: z.object({ title: optionalText }).strict(), slots: ["default"], description: "Groups inputs; put a Button with on.press runAction inside to submit" },
    Input: { props: z.object({ label: text, value: z.object({ $bindState: z.string().min(1) }).strict().describe("Two-way binding under /form, e.g. { \"$bindState\": \"/form/subject\" }"),
      placeholder: z.string().optional(), type: z.enum(["text", "email", "number", "date"]).default("text") }).strict(), slots: [], description: "Single-line text input bound to state" },
    Textarea: { props: z.object({ label: text, value: z.object({ $bindState: z.string().min(1) }).strict(), placeholder: z.string().optional(), rows: z.number().int().min(2).max(12).default(4) }).strict(),
      slots: [], description: "Multi-line text input bound to state" },
    Select: { props: z.object({ label: text, value: z.object({ $bindState: z.string().min(1) }).strict(),
      options: z.array(z.object({ value: z.string(), label: z.string() }).strict()).min(1).max(100) }).strict(), slots: [], description: "Dropdown bound to state" },
    Checkbox: { props: z.object({ label: text, checked: z.object({ $bindState: z.string().min(1) }).strict() }).strict(), slots: [], description: "Checkbox bound to state" },
    DateRange: { props: z.object({ label: text, from: z.object({ $bindState: z.string().min(1) }).strict().describe("State path that receives the start date as YYYY-MM-DD, e.g. { \"$bindState\": \"/filters/from\" }"),
      to: z.object({ $bindState: z.string().min(1) }).strict().describe("State path that receives the end date as YYYY-MM-DD"),
      preset: z.enum(["today", "last7", "last30", "thisMonth", "lastMonth", "custom"]).default("last30").describe("Range chosen until the user picks another") }).strict(),
      slots: [], description: "A date range with presets (today, last 7 days, last 30 days, this month, last month) or two dates; writes both dates to state, for source arguments such as since and until" },
    Button: { props: z.object({ label: text, variant: z.enum(["primary", "secondary", "outline", "ghost", "destructive"]).default("secondary") }).strict(),
      slots: [], description: "Button; bind on.press to runAction or refresh" }
  },
  actions: {
    runAction: { params: z.object({ actionId: z.string().min(1).describe("Id from the app's actions"),
      item: z.unknown().optional().describe("Inside a repeat, pass { \"$item\": \"\" } so item bindings read the current row") }).strict(),
      description: "Runs one of the app's connector actions (declared in spec.actions) and refreshes the sources it names" },
    refresh: { params: z.object({ sourceIds: z.array(z.string().min(1)).optional() }).strict(), description: "Reloads every source, or only the ids given" }
  }
});

export type AppCatalog = typeof appCatalog;
