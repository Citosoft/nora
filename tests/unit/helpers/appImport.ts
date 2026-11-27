import { mkdtemp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AppImportEnvironment, AppImportReadContext, NativeSessionLookup } from "@main/types/app-import/appImportSource.types";
import type { AppImportPlan, AppImportReadResult } from "@shared/types/app-import/appImportPlan.types";

export async function withTempHome(run: (home: string) => Promise<void>): Promise<void> {
  const home = await realpath(await mkdtemp(path.join(os.tmpdir(), "nora-app-import-")));
  try { await run(home); } finally { await rm(home, { recursive: true, force: true }); }
}

export function testEnvironment(home: string, overrides: Partial<AppImportEnvironment> = {}): AppImportEnvironment {
  return { homeDir: home, platform: "darwin", appDataDir: null, xdgConfigHome: null, variables: {}, ...overrides };
}

/** Lookup that reports `sessions` as the native ids still on disk, regardless of cwd. */
export function fakeSessions(sessions: Partial<Record<"claude" | "codex", readonly string[]>>): NativeSessionLookup {
  return { listSessionIds: async (provider) => new Set(sessions[provider] ?? []) };
}

export function readContext(env: AppImportEnvironment, sessions: NativeSessionLookup = fakeSessions({})): AppImportReadContext {
  return { env, sessions };
}

export async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value));
}

export function expectPlan(result: AppImportReadResult): AppImportPlan {
  if (result.status !== "ready") throw new Error(`Expected a plan, got ${result.status}: ${"reason" in result ? result.reason : ""}`);
  return result.plan;
}

/** Every secret fixture value contains this marker; a plan must never include it. */
export const SECRET_MARKER = "NORA_TEST_SECRET";
