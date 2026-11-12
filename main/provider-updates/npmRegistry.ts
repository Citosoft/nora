import { z } from "zod";
import type { FetchJson, ResolveVersion } from "@main/types/providerUpdates.types";

const NPM_REGISTRY_URL = "https://registry.npmjs.org";
const REGISTRY_TIMEOUT_MS = 8_000;
const latestManifestSchema = z.object({ version: z.string() });

/** Reads the `latest` dist-tag version of an npm package; network or registry failures resolve to `null`. */
export function createNpmLatestVersionReader(fetchJson: FetchJson = fetch): ResolveVersion {
  return async (packageName) => {
    try {
      // Scoped names keep their `@` but must encode the scope separator.
      const response = await fetchJson(`${NPM_REGISTRY_URL}/${packageName.replace("/", "%2F")}/latest`, {
        signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS)
      });
      if (!response.ok) return null;
      const parsed = latestManifestSchema.safeParse(await response.json());
      return parsed.success ? parsed.data.version : null;
    } catch {
      return null;
    }
  };
}
