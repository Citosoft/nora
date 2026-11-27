import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { sqliteTableNames, sqliteUserVersion, withReadonlySqlite } from "@main/app-import/readonlySqlite";
import type { OrcaDocumentPart, OrcaStoreRead } from "@main/types/app-import/orca.types";
import { assembleOrcaDomain, parseOrcaPartKey } from "./documentParts";
import { ORCA_PROFILE_STATE_SCHEMA_VERSION } from "./paths";

const documentRowSchema = z.object({ domain: z.string(), payload: z.string(), revision: z.number() });
const metaRowSchema = z.object({ legacy_revision: z.number().nullable() });
const partRowSchema = z.object({ part_key: z.string(), payload: z.string() });

/**
 * Split parts are authoritative only while their `legacy_revision` matches the document row's
 * revision; an older Orca build that rewrote the legacy row makes that row authoritative again.
 */
function readSplitDomain(database: DatabaseSync, domain: string, revision: number): unknown {
  const meta = metaRowSchema.safeParse(database.prepare("SELECT legacy_revision FROM profile_state_document_parts_meta WHERE domain = ?").get(domain));
  if (!meta.success || meta.data.legacy_revision !== revision) return undefined;
  const parts: OrcaDocumentPart[] = [];
  for (const raw of database.prepare("SELECT part_key, payload FROM profile_state_document_parts WHERE domain = ? ORDER BY ordinal").all(domain)) {
    const row = partRowSchema.safeParse(raw);
    const path = row.success ? parseOrcaPartKey(row.data.part_key) : null;
    if (!row.success || !path) return undefined;
    parts.push({ path, payload: row.data.payload });
  }
  try {
    return assembleOrcaDomain(parts);
  } catch {
    return undefined;
  }
}

function parseLegacyPayload(payload: string): unknown {
  try {
    const value: unknown = JSON.parse(payload);
    return value;
  } catch {
    return undefined;
  }
}

/** Reads the requested PersistedState domains from a profile-state.db (Orca schema v3). */
export function readOrcaProfileStateDatabase(path: string, domains: readonly string[]): OrcaStoreRead {
  return withReadonlySqlite(path, (database): OrcaStoreRead => {
    const version = sqliteUserVersion(database);
    if (version !== ORCA_PROFILE_STATE_SCHEMA_VERSION) {
      return { status: "unsupported", reason: version !== null && version > ORCA_PROFILE_STATE_SCHEMA_VERSION
        ? `This Orca profile was saved by a newer Orca (schema ${version}); update Nora to import it.`
        : `This Orca profile uses an older layout (schema ${version ?? "unknown"}); open it in Orca once to upgrade it.` };
    }
    const tables = sqliteTableNames(database);
    if (!tables.has("profile_state_documents")) return { status: "unreadable", reason: "The Orca profile database has no state documents." };
    const hasParts = tables.has("profile_state_document_parts") && tables.has("profile_state_document_parts_meta");
    const placeholders = domains.map(() => "?").join(", ");
    const result = new Map<string, unknown>();
    for (const raw of database.prepare(`SELECT domain, payload, revision FROM profile_state_documents WHERE domain IN (${placeholders})`).all(...domains)) {
      const row = documentRowSchema.safeParse(raw);
      if (!row.success) continue;
      const split = hasParts ? readSplitDomain(database, row.data.domain, row.data.revision) : undefined;
      const value = split ?? parseLegacyPayload(row.data.payload);
      if (value !== undefined) result.set(row.data.domain, value);
    }
    return { status: "ok", domains: result, version };
  });
}
