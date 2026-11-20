/**
 * What a thread's agent may reach beyond the model itself: `full` is a working thread with the runtime's own tools and the user's MCP
 * servers; `inspect` is a read-only review (file inspection only); `read-worker` permits commands inside a read-only sandbox; `apps` is an app's builder, which touches nothing but Nora's app
 * tools and the connectors chosen for the app.
 */
export type ThreadToolScope = "full" | "inspect" | "read-worker" | "apps";
