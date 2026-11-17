import { DatabaseSync } from "node:sqlite";
import { routineRunSchema, routineSchema } from "@shared/bots/routines/contracts";
import type { Routine, RoutineRun } from "@shared/types/bots/routines.types";
import type { RoutineStore } from "@main/types/bots/routines.types";

/** History kept per routine; older runs are dropped as new ones are written. */
const RUNS_PER_ROUTINE = 50;
const UNFINISHED = "('queued', 'running', 'needs-attention')";

const toRoutine = (row: Record<string, unknown>): Routine => routineSchema.parse(JSON.parse(String(row.data)));
const toRun = (row: Record<string, unknown>): RoutineRun => routineRunSchema.parse(JSON.parse(String(row.data)));

/** Rows are stored as validated JSON next to the columns the scheduler queries, so the schema can grow without migrations. */
export function openRoutineStore(path: string): RoutineStore {
  const database = new DatabaseSync(path);
  database.exec(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS routines (id TEXT PRIMARY KEY, bot_id TEXT NOT NULL, created_at TEXT NOT NULL, data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS routines_bot ON routines (bot_id, created_at);
    CREATE TABLE IF NOT EXISTS routine_runs (id TEXT PRIMARY KEY, routine_id TEXT NOT NULL, bot_id TEXT NOT NULL, status TEXT NOT NULL,
      created_at TEXT NOT NULL, data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS routine_runs_routine ON routine_runs (routine_id, created_at);
    CREATE INDEX IF NOT EXISTS routine_runs_bot ON routine_runs (bot_id, created_at);`);
  const routines = (where: string, ...values: string[]): Routine[] =>
    database.prepare(`SELECT data FROM routines ${where} ORDER BY created_at, rowid`).all(...values).map(toRoutine);
  const runs = (where: string, ...values: (string | number)[]): RoutineRun[] =>
    database.prepare(`SELECT data FROM routine_runs ${where}`).all(...values).map(toRun);
  return {
    list: (botId) => routines("WHERE bot_id = ?", botId),
    all: () => routines(""),
    get: (id) => routines("WHERE id = ?", id)[0] ?? null,
    put(routine) {
      const valid = routineSchema.parse(routine);
      database.prepare(`INSERT INTO routines (id, bot_id, created_at, data) VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET data = excluded.data`).run(valid.id, valid.botId, valid.createdAt, JSON.stringify(valid));
    },
    remove(id) {
      database.prepare("DELETE FROM routine_runs WHERE routine_id = ?").run(id);
      database.prepare("DELETE FROM routines WHERE id = ?").run(id);
    },
    count: (botId) => (database.prepare("SELECT COUNT(*) AS count FROM routines WHERE bot_id = ?").get(botId) as { count: number }).count,
    runs: (botId, limit) => runs("WHERE bot_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?", botId, limit),
    getRun: (id) => runs("WHERE id = ?", id)[0] ?? null,
    allRuns: () => runs("ORDER BY created_at"),
    putRun(run) {
      const valid = routineRunSchema.parse(run);
      database.prepare(`INSERT INTO routine_runs (id, routine_id, bot_id, status, created_at, data) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET status = excluded.status, data = excluded.data`)
        .run(valid.id, valid.routineId, valid.botId, valid.status, valid.createdAt, JSON.stringify(valid));
      database.prepare(`DELETE FROM routine_runs WHERE routine_id = ? AND status NOT IN ${UNFINISHED} AND id NOT IN
        (SELECT id FROM routine_runs WHERE routine_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?)`).run(valid.routineId, valid.routineId, RUNS_PER_ROUTINE);
    },
    unfinishedRuns: (routineId) => runs(`WHERE routine_id = ? AND status IN ${UNFINISHED} ORDER BY created_at`, routineId),
    allUnfinishedRuns: () => runs(`WHERE status IN ${UNFINISHED} ORDER BY created_at`),
    close: () => database.close()
  };
}
