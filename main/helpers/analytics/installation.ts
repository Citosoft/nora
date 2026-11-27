import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { InstallationIdentity } from "@main/types/analytics/analytics.types";

const stateSchema = z.object({ installationId: z.string().uuid(), reported: z.boolean() });

/**
 * A random ID that lets Nora count unique installations without knowing who uses them. It is deliberately separate from
 * the account and never sent alongside account details.
 */
export async function loadInstallationIdentity(statePath: string, nextId: () => string = randomUUID): Promise<InstallationIdentity> {
  try {
    const raw: unknown = JSON.parse(await readFile(statePath, "utf8"));
    const state = stateSchema.parse(raw);
    return { installationId: state.installationId, isFirstLaunch: !state.reported };
  } catch (error) {
    // Never replace an unreadable or invalid identity and inflate install counts.
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    const installationId = nextId();
    await mkdir(path.dirname(statePath), { recursive: true });
    await writeFile(statePath, JSON.stringify({ installationId, reported: false }), { encoding: "utf8", mode: 0o600, flag: "wx" });
    return { installationId, isFirstLaunch: true };
  }
}

export async function markInstallationReported(statePath: string, identity: InstallationIdentity): Promise<void> {
  if (!identity.isFirstLaunch) return;
  await writeFile(statePath, JSON.stringify({ installationId: identity.installationId, reported: true }), { encoding: "utf8", mode: 0o600 });
}
