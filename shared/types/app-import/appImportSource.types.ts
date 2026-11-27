/** Apps Nora can migrate data from. */
export type AppImportSourceId = "claude" | "codex" | "t3-code" | "orca" | "openbot" | "bot-export";

/** Apps Nora finds on disk by itself; a bot export is supplied by the user instead. */
export type AppImportDetectedSourceId = Exclude<AppImportSourceId, "bot-export">;

/** On-disk layout the source data was read from; drives version-specific reading and messaging. */
export type AppImportFormat =
  | {
      source: "t3-code";
      /** v2 = orchestration v2 projections; v1 = legacy projection_threads tables. */
      schema: "v1" | "v2";
      /** Highest applied effect_sql_migrations id, when recorded. */
      migration: number | null;
    }
  | {
      /** Claude/Codex session history, read only for the project folders sessions ran in. */
      source: "claude" | "codex";
      store: "sessionHistory";
    }
  | {
      /** OpenBot's agents: its database when present, otherwise only the agent folders. */
      source: "openbot";
      store: "database" | "agentFolders";
      /**
       * Name of the server OpenBot on this computer is connected to, if any. Bots kept on a server aren't stored
       * here, so they only come over through an export.
       */
      remoteServer: string | null;
    }
  | {
      /** A Nora bot export pasted or chosen by the user, e.g. one Grok Bot generated. */
      source: "bot-export";
      version: 1;
      /** The app the export says it came from, if any. */
      origin: string | null;
    }
  | {
      source: "orca";
      store: "profileStateDb" | "profileJson" | "legacyJson";
      /** SQLite user_version for the database store, schemaVersion for JSON stores. */
      version: number | null;
    };

export type AppImportDetection =
  | { status: "found"; source: AppImportSourceId; dataPath: string; format: AppImportFormat }
  | { status: "notFound"; source: AppImportSourceId; searchedPaths: string[] }
  /** Data exists but uses a layout this build refuses to read (for example a newer schema). */
  | { status: "unsupported"; source: AppImportSourceId; dataPath: string; reason: string }
  | { status: "unreadable"; source: AppImportSourceId; dataPath: string; reason: string };

export type AppImportDetectionFailure = Exclude<AppImportDetection, { status: "found" }>;
