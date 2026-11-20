import type { AppSpecInput } from "@shared/types/apps/apps.types";
import type { Connector } from "@shared/types/connectors/connectors.types";
import type { ConnectorToolAccess, ConnectorToolCallResult } from "@main/types/connectors/connectors.types";
import type { JsonValue } from "@main/jsonValue";
import { ConnectorToolError } from "@main/connectors/toolError";
import type { AppFileSourceReader } from "@main/types/apps/fileSource.types";

export const CONNECTOR_ID = "00000000-0000-4000-8000-000000000001";
export const WORKSPACE_ID = "workspace-1";

export const connector = (overrides: Partial<Connector> = {}): Connector => ({ id: CONNECTOR_ID, name: "CRM", serverName: "crm", url: "https://crm.example.com/mcp", enabled: true,
  auth: { kind: "header", name: "x-api-key" }, access: { workspaces: { kind: "all" }, bots: { kind: "all" } }, status: "connected",
  tools: [{ name: "list_contacts", description: "Lists contacts", inputSchema: { type: "object", properties: { limit: { type: "number" } } } }, { name: "create_ticket" }], ...overrides });

/** A spec the way the agent sends it: one table over one source and a button that creates a ticket. */
export const spec = (overrides: Partial<AppSpecInput> = {}): AppSpecInput => ({
  alerts: {},
  sources: { contacts: { kind: "connector", connectorId: CONNECTOR_ID, tool: "list_contacts", args: { limit: 5 }, select: "results[].{\"id\": id, \"name\": name}", refresh: { kind: "open" } } },
  actions: { ticket: { connectorId: CONNECTOR_ID, tool: "create_ticket", args: { subject: { kind: "state", path: "/form/subject" }, contactId: { kind: "item", field: "id" } }, refreshSources: ["contacts"] } },
  ui: { root: "main", elements: {
    main: { type: "Stack", props: {}, children: ["card", "form"] },
    card: { type: "Card", props: { title: "Contacts", source: "contacts" }, children: ["table"] },
    table: { type: "Table", props: { rows: { $state: "/sources/contacts" }, columns: [{ key: "name", label: "Name" }], rowAction: "ticket" }, children: [] },
    form: { type: "Form", props: {}, children: ["subject", "go"] },
    subject: { type: "Input", props: { label: "Subject", value: { $bindState: "/form/subject" } }, children: [] },
    go: { type: "Button", props: { label: "Create ticket" }, children: [], on: { press: { action: "runAction", params: { actionId: "ticket" } } } }
  } },
  ...overrides
});

export const SAMPLE: JsonValue = { results: [{ id: "1", name: "Ada" }, { id: "2", name: "Rex" }] };

export interface FakeFileSources extends AppFileSourceReader {
  files: Map<string, JsonValue>;
  /** Fires every watcher on a path, as a change on disk would. */
  change(path: string): void;
}
/** Stands in for the disk: paths map to what the reader would return, and `change` plays back a file edit. */
export function fakeFileSources(files: Record<string, JsonValue> = {}): FakeFileSources {
  const watchers = new Map<string, Set<() => void>>();
  const fake: FakeFileSources = {
    files: new Map(Object.entries(files)),
    async read(path) { const value = fake.files.get(path); if (value === undefined) throw new ConnectorToolError("unavailable", `${path} was not found.`); return value; },
    watch(path, onChange) { const set = watchers.get(path) ?? new Set(); set.add(onChange); watchers.set(path, set); return () => { set.delete(onChange); }; },
    change(path) { for (const listener of watchers.get(path) ?? []) listener(); }
  };
  return fake;
}

export interface FakeConnectorTools extends ConnectorToolAccess {
  calls: { connectorId: string; tool: string; args: Record<string, JsonValue> }[];
  reply: (tool: string, args: Record<string, JsonValue>) => ConnectorToolCallResult;
}
/** Stands in for the connector service: records calls and answers with whatever the test sets as `reply`. */
export function fakeConnectorTools(connectors: Connector[] = [connector()]): FakeConnectorTools {
  const fake: FakeConnectorTools = {
    calls: [],
    reply: () => ({ content: [{ type: "text", text: JSON.stringify(SAMPLE) }] }),
    async call(connectorId, tool, args) {
      if (!connectors.some((entry) => entry.id === connectorId)) throw new ConnectorToolError("unavailable", "This connector is not available here.");
      fake.calls.push({ connectorId, tool, args });
      return fake.reply(tool, args);
    },
    available: () => connectors
  };
  return fake;
}
