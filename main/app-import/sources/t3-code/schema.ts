import type { DatabaseSync } from "node:sqlite";
import { sqliteTableNames } from "@main/app-import/readonlySqlite";
import type { T3CodeSchemaInfo } from "@main/types/app-import/t3Code.types";

const V2_TABLES = ["projection_projects", "orchestration_v2_projection_threads", "orchestration_v2_projection_messages"];
const V1_TABLES = ["projection_projects", "projection_threads", "projection_thread_messages"];

/** Detect by table presence: T3 Code keeps v1 tables beside v2 ones after migrating, so v2 wins when present. */
export function readT3CodeSchema(database: DatabaseSync): T3CodeSchemaInfo | null {
  const tables = sqliteTableNames(database);
  const schema = V2_TABLES.every((table) => tables.has(table)) ? "v2" : V1_TABLES.every((table) => tables.has(table)) ? "v1" : null;
  if (!schema) return null;
  const migration = tables.has("effect_sql_migrations")
    ? database.prepare("SELECT max(migration_id) AS migration FROM effect_sql_migrations").get()?.migration
    : null;
  return { schema, migration: typeof migration === "number" ? migration : null, tables };
}
