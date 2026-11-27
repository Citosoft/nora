/** IPC channels between the main process and the island windows; kept free of zod so the sandboxed preload stays small. */
export const ISLAND_CHANNELS = {
  /** Main → island: the whole view whenever the work or the notch geometry changes. */
  view: "island:view",
  /** Island → main: the pointer entered (true) or left (false) the island shape. */
  interactive: "island:interactive",
  /** Island → main: open a row's thread or agent in Nora. */
  open: "island:open",
  /** Island → main: show Nora's inbox. */
  openInbox: "island:open-inbox",
  /** Island → main: bring Nora's window forward. */
  openNora: "island:open-nora",
  /** App window → main: show the island with sample work for a short while (Settings → Developer). */
  demo: "island:demo",
  /** App window → main: end a running demo now, e.g. when Settings closes. */
  stopDemo: "island:stop-demo"
} as const;
