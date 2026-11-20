import { DatabaseSync } from "node:sqlite";
import { appDefinitionSchema, appSpecSchema, appSummarySchema } from "@shared/apps/contracts";
import { appSummaryOf } from "@shared/apps/summary";
import type { AppActivityEntry, AppDefinition, AppSummary, AppVersion } from "@shared/types/apps/apps.types";
import type { AppStore } from "@main/types/apps/apps.types";
import type { AppAlertState } from "@main/types/apps/alerts.types";
import type { JsonValue } from "@main/jsonValue";

/** Versions kept per app; older ones are dropped as new ones are written. */
const VERSIONS_PER_APP = 50;
/** Actions kept in an app's activity log. */
const ACTIVITY_PER_APP = 200;

const toDefinition = (row: Record<string, unknown>): AppDefinition => appDefinitionSchema.parse(JSON.parse(String(row.data)));
const toSummary = (row: Record<string, unknown>): AppSummary => appSummarySchema.parse(JSON.parse(String(row.summary)));

/**
 * Apps and their version history, as validated JSON beside the columns the service queries. A sample is the raw result of one
 * source's tool call, kept so the agent's `select` expression can be checked against real data on every save.
 */
export function openAppStore(path: string): AppStore {
  const database = new DatabaseSync(path);
  database.exec(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS apps (id TEXT PRIMARY KEY, updated_at TEXT NOT NULL, summary TEXT NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS app_versions (app_id TEXT NOT NULL, version INTEGER NOT NULL, created_at TEXT NOT NULL, summary TEXT NOT NULL, spec TEXT NOT NULL,
      PRIMARY KEY (app_id, version));
    CREATE TABLE IF NOT EXISTS app_samples (app_id TEXT NOT NULL, source_id TEXT NOT NULL, sampled_at TEXT NOT NULL, result TEXT NOT NULL,
      PRIMARY KEY (app_id, source_id));
    CREATE TABLE IF NOT EXISTS app_alerts (app_id TEXT NOT NULL, alert_id TEXT NOT NULL, key TEXT NOT NULL, title TEXT NOT NULL, detail TEXT, fired_at TEXT NOT NULL,
      PRIMARY KEY (app_id, alert_id));
    CREATE TABLE IF NOT EXISTS app_activity (id INTEGER PRIMARY KEY AUTOINCREMENT, app_id TEXT NOT NULL, at TEXT NOT NULL, action_id TEXT NOT NULL, tool TEXT NOT NULL,
      connector_name TEXT NOT NULL, args TEXT NOT NULL, confirmed INTEGER NOT NULL, ok INTEGER NOT NULL, message TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS app_activity_by_app ON app_activity (app_id, id);`);
  // Summaries written before they carried connector ids are rebuilt once from the stored app.
  for (const row of database.prepare("SELECT data FROM apps WHERE json_extract(summary, '$.connectorIds') IS NULL").all() as Record<string, unknown>[]) {
    const parsed = appDefinitionSchema.safeParse(JSON.parse(String(row.data)));
    if (parsed.success) database.prepare("UPDATE apps SET summary = ? WHERE id = ?").run(JSON.stringify(appSummaryOf(parsed.data)), parsed.data.id);
  }
  const toAlertState = (row: Record<string, unknown>): AppAlertState => ({ alertId: String(row.alert_id), key: String(row.key), title: String(row.title),
    detail: row.detail === null || row.detail === undefined ? null : String(row.detail), firedAt: String(row.fired_at) });
  const rows = (where: string, ...values: string[]): Record<string, unknown>[] =>
    database.prepare(`SELECT data FROM apps ${where} ORDER BY updated_at DESC, rowid DESC`).all(...values) as Record<string, unknown>[];
  return {
    list: () => (database.prepare("SELECT summary FROM apps ORDER BY updated_at DESC, rowid DESC").all() as Record<string, unknown>[]).map(toSummary),
    get: (id) => { const row = rows("WHERE id = ?", id)[0]; return row ? toDefinition(row) : null; },
    patch(app) {
      const valid = appDefinitionSchema.parse(app);
      const summary = appSummaryOf(valid);
      database.prepare("UPDATE apps SET updated_at = ?, summary = ?, data = ? WHERE id = ?").run(valid.updatedAt, JSON.stringify(summary), JSON.stringify(valid), valid.id);
    },
    put(app, versionSummary) {
      const valid = appDefinitionSchema.parse(app);
      const summary = appSummaryOf(valid);
      database.prepare(`INSERT INTO apps (id, updated_at, summary, data) VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, summary = excluded.summary, data = excluded.data`)
        .run(valid.id, valid.updatedAt, JSON.stringify(summary), JSON.stringify(valid));
      database.prepare(`INSERT INTO app_versions (app_id, version, created_at, summary, spec) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(app_id, version) DO UPDATE SET created_at = excluded.created_at, summary = excluded.summary, spec = excluded.spec`)
        .run(valid.id, valid.version, valid.updatedAt, versionSummary, JSON.stringify(valid.spec));
      database.prepare(`DELETE FROM app_versions WHERE app_id = ? AND version NOT IN (SELECT version FROM app_versions WHERE app_id = ? ORDER BY version DESC LIMIT ?)`)
        .run(valid.id, valid.id, VERSIONS_PER_APP);
    },
    remove(id) {
      database.prepare("DELETE FROM app_activity WHERE app_id = ?").run(id);
      database.prepare("DELETE FROM app_alerts WHERE app_id = ?").run(id);
      database.prepare("DELETE FROM app_samples WHERE app_id = ?").run(id);
      database.prepare("DELETE FROM app_versions WHERE app_id = ?").run(id);
      database.prepare("DELETE FROM apps WHERE id = ?").run(id);
    },
    versions: (id) => (database.prepare("SELECT version, created_at, summary FROM app_versions WHERE app_id = ? ORDER BY version DESC").all(id) as Record<string, unknown>[])
      .map((row): AppVersion => ({ version: Number(row.version), createdAt: String(row.created_at), summary: String(row.summary) })),
    versionSpec(id, version) {
      const row = database.prepare("SELECT spec FROM app_versions WHERE app_id = ? AND version = ?").get(id, version) as Record<string, unknown> | undefined;
      return row ? appSpecSchema.parse(JSON.parse(String(row.spec))) : null;
    },
    sample(appId, sourceId) {
      const row = database.prepare("SELECT sampled_at, result FROM app_samples WHERE app_id = ? AND source_id = ?").get(appId, sourceId) as Record<string, unknown> | undefined;
      return row ? { sourceId, sampledAt: String(row.sampled_at), result: JSON.parse(String(row.result)) as JsonValue } : null;
    },
    putSample(appId, sample) {
      database.prepare(`INSERT INTO app_samples (app_id, source_id, sampled_at, result) VALUES (?, ?, ?, ?)
        ON CONFLICT(app_id, source_id) DO UPDATE SET sampled_at = excluded.sampled_at, result = excluded.result`)
        .run(appId, sample.sourceId, sample.sampledAt, JSON.stringify(sample.result));
    },
    alertStates: (appId) => (database.prepare("SELECT * FROM app_alerts WHERE app_id = ? ORDER BY fired_at").all(appId) as Record<string, unknown>[]).map(toAlertState),
    allAlertStates: () => (database.prepare("SELECT * FROM app_alerts ORDER BY fired_at").all() as Record<string, unknown>[]).map((row) => ({ appId: String(row.app_id), state: toAlertState(row) })),
    putAlertState(appId, state) {
      database.prepare(`INSERT INTO app_alerts (app_id, alert_id, key, title, detail, fired_at) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(app_id, alert_id) DO UPDATE SET key = excluded.key, title = excluded.title, detail = excluded.detail, fired_at = excluded.fired_at`)
        .run(appId, state.alertId, state.key, state.title, state.detail, state.firedAt);
    },
    clearAlertState: (appId, alertId) => { database.prepare("DELETE FROM app_alerts WHERE app_id = ? AND alert_id = ?").run(appId, alertId); },
    activity: (appId) => (database.prepare("SELECT * FROM app_activity WHERE app_id = ? ORDER BY id DESC LIMIT ?").all(appId, ACTIVITY_PER_APP) as Record<string, unknown>[])
      .map((row): AppActivityEntry => ({ id: Number(row.id), at: String(row.at), actionId: String(row.action_id), tool: String(row.tool), connectorName: String(row.connector_name),
        args: JSON.parse(String(row.args)) as Record<string, JsonValue>, confirmed: row.confirmed === 1, ok: row.ok === 1, message: String(row.message) })),
    putActivity(appId, entry) {
      database.prepare("INSERT INTO app_activity (app_id, at, action_id, tool, connector_name, args, confirmed, ok, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(appId, entry.at, entry.actionId, entry.tool, entry.connectorName, JSON.stringify(entry.args), entry.confirmed ? 1 : 0, entry.ok ? 1 : 0, entry.message);
      database.prepare("DELETE FROM app_activity WHERE app_id = ? AND id NOT IN (SELECT id FROM app_activity WHERE app_id = ? ORDER BY id DESC LIMIT ?)").run(appId, appId, ACTIVITY_PER_APP);
    },
    close: () => database.close()
  };
}
