import { z } from "zod";
import { appCatalog } from "@shared/apps/catalog";
import { APP_SAMPLE_MAX_BYTES, APP_SOURCE_MIN_INTERVAL_SECONDS, APP_SOURCE_ROW_LIMIT } from "@shared/apps/contracts";

/** A Zod schema as one line the model can read, built from its JSON Schema. */
function describeSchema(schema: z.ZodType): string {
  const json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
  return describeJsonSchema(json);
}
function describeJsonSchema(schema: Record<string, unknown>): string {
  const variants = Array.isArray(schema.anyOf) ? schema.anyOf : Array.isArray(schema.oneOf) ? schema.oneOf : null;
  if (variants) {
    // Props are `literal | expression`; the expression half is the same everywhere and documented once below.
    const literal = variants.find((entry) => !(typeof entry === "object" && entry && "anyOf" in entry));
    return literal && typeof literal === "object" ? `${describeJsonSchema(literal as Record<string, unknown>)}*` : "any";
  }
  if (Array.isArray(schema.enum)) return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  if ("const" in schema) return JSON.stringify(schema.const);
  if (schema.type === "array" && schema.items && typeof schema.items === "object") return `Array<${describeJsonSchema(schema.items as Record<string, unknown>)}>`;
  if (schema.type === "object" && schema.properties && typeof schema.properties === "object") {
    const required = new Set(Array.isArray(schema.required) ? schema.required as string[] : []);
    const fields = Object.entries(schema.properties as Record<string, Record<string, unknown>>).map(([name, field]) => {
      const text = `${name}${required.has(name) ? "" : "?"}: ${describeJsonSchema(field)}`;
      const notes = [typeof field.description === "string" ? field.description : null, "default" in field ? `default ${JSON.stringify(field.default)}` : null].filter(Boolean);
      return notes.length ? `${text} (${notes.join("; ")})` : text;
    });
    return `{ ${fields.join(", ")} }`;
  }
  if (Array.isArray(schema.type)) return schema.type.join(" | ");
  return typeof schema.type === "string" ? schema.type : "any";
}

const components = (): string => Object.entries(appCatalog.data.components).map(([name, entry]) =>
  `- ${name}: ${describeSchema(entry.props)} — ${entry.description}${entry.slots.length ? " [accepts children]" : ""}`).join("\n");
const actions = (): string => Object.entries(appCatalog.data.actions).map(([name, entry]) => `- ${name}: ${describeSchema(entry.params)} — ${entry.description}`).join("\n");

/**
 * What the agent is told about building apps: the shape of a spec, how data flows from connectors to components, and the catalog.
 * Derived from the catalog so the components the model is offered and the ones the window renders never drift.
 */
export function appBuilderGuide(): string {
  return `# Building apps

An app is a dashboard or mini app that lives in Nora's Apps section. It shows live data from the user's connectors and can run connector tools. You build it by saving a spec with create_app (new) or update_app (change), and it renders at once beside this chat.

## Workflow
1. list_connector_tools to see what the user's connectors offer and each tool's input schema.
2. For every source, sample_connector_tool with the exact arguments the source will use (or sample_file for a file the user named). The reply is what the source's select expression sees. Keep samples small (pass limits or filters); the cap is ${(APP_SAMPLE_MAX_BYTES / 1024).toFixed(0)} KB.
3. Write the select expression (JSONata) that turns the sample into rows: an array of flat objects, e.g. \`results[].{"id": id, "name": properties.firstname & " " & properties.lastname, "amount": $number(properties.amount)}\`. Prefer simple field picks; keep numbers numeric and dates as ISO strings.
4. Call create_app with the complete spec. If it reports problems, fix them all and call it again. Then tell the user what the app shows in a sentence or two.
5. When the user asks for changes, read_app, change only what they asked for, and call update_app with a one-line summary. A request that starts "Change the "X" card" points at the Card whose title is X.
6. Give the app an \`icon\` that says what it is for (users for a CRM, receipt for invoices, kanban for a pipeline). update_app needs it too: repeat the current one, unless read_app shows "layout-dashboard" or the app's purpose changed, then choose one that fits.
7. With every create_app and update_app, pass \`suggestions\`: two or three short next changes the user may want, as requests ("Add a chart of value by stage", "Filter contacts by owner"). They appear as one-click chips under the app, so do not repeat them in your reply.

## Spec
{ "sources": { <sourceId>: { "kind": "connector", "connectorId", "tool", "args", "select", "refresh"?: { "kind": "open" } | { "kind": "interval", "seconds": ≥${APP_SOURCE_MIN_INTERVAL_SECONDS}, "background"?: boolean } }
                        | { "kind": "file", "path": "~/Documents/leads.csv", "select", "refresh"? } },
  "alerts": { <alertId>: { "source": <sourceId>, "when": <JSONata over the rows, truthy to fire>, "title": <text with \${JSONata} parts>, "detail"?: <same>, "key"?: <same>, "tier"?: "update" | "needs-you" } },
  "actions": { <actionId>: { "connectorId", "tool", "args": { <argName>: { "kind": "literal", "value" } | { "kind": "state", "path": "/form/…" } | { "kind": "item", "field" } }, "confirm"?: string, "refreshSources"?: [<sourceId>] } },
  "ui": { "root": <elementId>, "elements": { <elementId>: { "type", "props", "children": [<elementId>], "visible"?, "repeat"?, "on"? } } } }

- Source and action ids are short identifiers (letters, digits, _ or -). Element ids are any short unique strings.
- Shaped rows of a source are available to the UI at state path /sources/<sourceId>. At most ${APP_SOURCE_ROW_LIMIT} rows are kept.
- A source argument can read app state instead of being fixed: "args": { "status": { "$state": "/filters/status" } }. Bind an Input or Select to that path with { "$bindState": "/filters/status" } and the source reloads whenever the value changes; an empty value leaves the argument out of the call. Put defaults in "ui": { "state": { "filters": { "status": "open" } } }. Use this for filters, searches and date ranges the user should control; sample the tool with concrete values.
- A tool that pages can keep going: give the source "page": { "kind": "offset", "arg": "offset", "size": 50 } (with "limit": 50 in args) or { "kind": "cursor", "arg": "cursor", "next": "next_cursor" } (JSONata over the raw result for the next cursor, empty at the end). The card then offers Load more and the next page is appended. Leave the page argument out of args.
- For a time window, use DateRange: "from": { "$bindState": "/filters/from" }, "to": { "$bindState": "/filters/to" } and a "preset" such as "last30"; it writes YYYY-MM-DD dates the user never has to type, and the source's arguments read them with { "$state": "/filters/from" } (convert in "args" only if the tool wants another shape; otherwise sample with the same date format).
- Form inputs bind to state under /form with { "$bindState": "/form/<field>" }; an action's { "kind": "state", "path": "/form/<field>" } argument reads that value when it runs.
- A row action (Table or List rowAction, or runAction with "item": { "$item": "" } inside a repeat) runs with that row; the action's { "kind": "item", "field" } arguments read the row's fields.
- Actions that write to a connector show a confirmation to the user before running unless they trust the app; "confirm" replaces the default wording.
- Every element needs "type", "props" and "children" (an empty array for leaves). Only the components below exist. Put "visible", "repeat" and "on" on the element, never inside props.
- Props marked * accept an expression instead of a literal: { "$state": "/path" }, { "$item": "field" } (inside a repeat), { "$template": "\${/path} or \${field}" }, { "$cond": <condition>, "$then": …, "$else": … }, { "$bindState": "/path" } for inputs.
- "repeat": { "statePath": "/sources/<sourceId>", "key": "id" } on a container renders its children once per row; inside, { "$item": "field" } reads the row. Table, List and Chart read rows themselves through their "rows" prop, so they do not need repeat.
- "on": { "press": { "action": "runAction", "params": { "actionId": "<actionId>" } } } runs an action from a Button; { "action": "refresh" } reloads sources.
- "visible": { "$state": "/path", "eq": value } hides an element unless the condition holds ("not": true inverts; "$and" / "$or" combine).

## Files
A CSV, TSV or JSON file on the user's computer can be a source: { "kind": "file", "path": "~/Documents/leads.csv", "select": "$" }. CSV and TSV arrive as one object per row keyed by the first line (plain numbers already numeric), JSON as its value; the app re-reads the file whenever it changes on disk. Use the path the user gives, absolute or starting with ~; sample it with sample_file first. Files cannot be written to: actions still go through connectors.

## Alerts
An alert watches a source and lands in the user's Inbox (with a notification) when its condition becomes true, for example { "source": "invoices", "when": "$count($[status='overdue']) > 0", "title": "\${$count($[status='overdue'])} invoices overdue", "detail": "\${$join($[status='overdue'].number, ', ')}" }. It fires again only when its key (the rendered title unless "key" is given) changes, and clears when the condition turns false. "tier": "needs-you" keeps it in the Inbox until it clears; "update" can be marked done. For an alert to fire while the app is closed, its source needs "refresh": { "kind": "interval", "seconds": …, "background": true }; choose the longest interval that serves the purpose, since every tick calls the connector. Only add alerts the user asked for.

## Showing one record
Rows are selected with "selectPath", never with setState and { "$item" } (that stores a path, not the row). To let the user open a row: give the Table or List a "selectPath" (e.g. "/selected/contact"); clicking a row writes the whole row there. Show it with a Card whose "visible" is { "$state": "/selected/contact" } containing a Record with "item": { "$state": "/selected/contact" } and the fields to show, plus a Button with on.press setState { "statePath": "/selected/contact", "value": null } to go back. Hide the list meanwhile with "visible": { "$state": "/selected/contact", "not": true } if the record should replace it. For details the list rows lack, add a source whose argument reads the selection, e.g. "args": { "id": { "$state": "/selected/contact/id" } }; it loads when a row is selected, and a Record can show its single-object result with "item": { "$state": "/sources/<sourceId>" }.

## Layout
Start with a Stack or Grid at the root. Group each source in a Card with "source" set to its id so loading and errors show in place. Use Metric for headline numbers, Table for detail, Chart for trends, List for feeds, Form + Input/Select/Textarea + Button for actions. Keep it to what the user asked for.
Use Timeline for history or upcoming dates, Calendar for anything scheduled, Image for pictures a row carries and Link to open the record in the connected service. A tool with several screens uses Tabs: "tabs" names them and the children, in order, are each tab's content. A Kanban shows rows as cards in columns by a field ("groupBy": "status" with "columns" listing each value); give it a "moveAction" whose { "kind": "item", "field": "status" } argument reads the new value and drag-and-drop writes it back through the connector. Mark a Table column "editable": true and give the Table an "editAction" to let the user change values in place; the action's item arguments read the edited row. Sample the connector's update tool first, as with any action.

## Components
${components()}

## Actions (for "on")
${actions()}
Built in: setState { statePath, value } writes to state, e.g. to clear a form field.`;
}
