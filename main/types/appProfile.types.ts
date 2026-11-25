/**
 * The on-disk profile one Nora process owns. Development builds use their own profile so schema or
 * storage changes made while developing never reach the data an installed release reads.
 */
export type AppProfile =
  /** Electron's default userData directory and `~/.nora`, exactly as every released version uses them. */
  | { kind: "installed"; noraRoot: string }
  | { kind: "development"; noraRoot: string; userDataDirectory: string };

export interface AppProfileInput {
  isPackaged: boolean;
  homeDirectory: string;
  /** Electron's per-user application data directory (`app.getPath("appData")`). */
  appDataDirectory: string;
  productName: string;
}
