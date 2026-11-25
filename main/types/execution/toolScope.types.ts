/**
 * What a thread's agent may reach beyond the model itself:
 * - `full` — the user's own working thread: runtime tools plus the user's global MCP config and settings.
 * - `agent` — bots, chats and write workers: full built-ins, but only the run's own MCP servers (strict) and
 *   project/local settings (no user-global skills or MCP).
 * - `inspect` — a read-only review (file inspection only).
 * - `read-worker` — commands inside a read-only sandbox.
 * - `apps` — an app's builder: Nora's app tools and the connectors chosen for the app.
 */
export type ThreadToolScope = "full" | "agent" | "inspect" | "read-worker" | "apps";
