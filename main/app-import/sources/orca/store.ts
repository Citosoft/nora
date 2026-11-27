import path from "node:path";
import { z } from "zod";
import { pathExists, readJsonFile } from "@main/app-import/fileSystem";
import type { AppImportEnvironment } from "@main/types/app-import/appImportSource.types";
import type { OrcaStoreLocation, OrcaStoreRead, OrcaStoreSearch } from "@main/types/app-import/orca.types";
import { ORCA_DATA_BACKUP_COUNT, ORCA_DATA_FILE, ORCA_PROFILE_INDEX_FILE, ORCA_PROFILE_STATE_DATABASE, orcaUserDataDirectory } from "./paths";
import { readOrcaProfileStateDatabase } from "./profileState";

const profileIndexSchema = z.object({
  activeProfileId: z.string().min(1).nullable().optional().catch(undefined),
  profiles: z.array(z.object({ id: z.string().min(1) }).loose()).catch([])
});

/** Only path-safe profile ids: the id becomes a directory name. */
const SAFE_PROFILE_ID = /^[A-Za-z0-9._-]+$/;

async function activeProfileId(userData: string): Promise<string | null> {
  const file = await readJsonFile(path.join(userData, ORCA_PROFILE_INDEX_FILE));
  if (file.status !== "ok") return null;
  const index = profileIndexSchema.safeParse(file.value);
  if (!index.success) return null;
  const ids = index.data.profiles.map((profile) => profile.id).filter((id) => SAFE_PROFILE_ID.test(id));
  const active = index.data.activeProfileId;
  return active && ids.includes(active) ? active : ids[0] ?? null;
}

/** Orca's load order: profile database, then the profile's JSON, then the pre-profile root JSON. */
export async function locateOrcaStore(env: AppImportEnvironment): Promise<OrcaStoreSearch> {
  const userData = orcaUserDataDirectory(env);
  const searchedPaths: string[] = [];
  const profileId = await activeProfileId(userData);
  if (profileId) {
    const profileDir = path.join(userData, "profiles", profileId);
    const database = path.join(profileDir, ORCA_PROFILE_STATE_DATABASE);
    const json = path.join(profileDir, ORCA_DATA_FILE);
    searchedPaths.push(database, json);
    if (await pathExists(database)) return { location: { store: "profileStateDb", path: database, profileId }, searchedPaths };
    if (await pathExists(json)) return { location: { store: "profileJson", path: json, profileId }, searchedPaths };
  }
  const legacy = path.join(userData, ORCA_DATA_FILE);
  searchedPaths.push(legacy);
  if (await pathExists(legacy)) return { location: { store: "legacyJson", path: legacy }, searchedPaths };
  return { location: null, searchedPaths };
}

const persistedJsonSchema = z.record(z.string(), z.unknown());

/** `orca-data.json`, falling back to its rotating backups when the main file is damaged. */
async function readOrcaDataJson(file: string): Promise<OrcaStoreRead> {
  for (const candidate of [file, ...Array.from({ length: ORCA_DATA_BACKUP_COUNT }, (_, index) => `${file}.bak.${index}`)]) {
    const json = await readJsonFile(candidate);
    if (json.status !== "ok") continue;
    const parsed = persistedJsonSchema.safeParse(json.value);
    if (!parsed.success) continue;
    const version = parsed.data.schemaVersion;
    return { status: "ok", domains: new Map(Object.entries(parsed.data)), version: typeof version === "number" ? version : null };
  }
  return { status: "unreadable", reason: "orca-data.json and its backups could not be read." };
}

export async function readOrcaStore(location: OrcaStoreLocation, domains: readonly string[]): Promise<OrcaStoreRead> {
  if (location.store !== "profileStateDb") return await readOrcaDataJson(location.path);
  try {
    return readOrcaProfileStateDatabase(location.path, domains);
  } catch (error) {
    return { status: "unreadable", reason: error instanceof Error ? error.message : "Could not open the Orca profile database." };
  }
}
