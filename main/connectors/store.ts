import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { OAuthClientInformationFullSchema, OAuthClientInformationSchema, OAuthTokensSchema,
  OAuthMetadataSchema, OAuthProtectedResourceMetadataSchema, OpenIdProviderMetadataSchema } from "@modelcontextprotocol/sdk/shared/auth.js";
import { connectorAccessSchema, connectorIdSchema, connectorServerNameSchema } from "@shared/connectors/contracts";
import { CONNECTOR_ACCESS_ALL } from "@shared/connectors/access";
import { isNodeError } from "@main/nodeErrors";
import type { ConnectorSecrets, ConnectorStore, ConnectorStoreOptions, StoredConnector } from "@main/types/connectors/connectors.types";

const storedConnectorSchema = z.object({ id: connectorIdSchema, name: z.string(), serverName: connectorServerNameSchema, url: z.string(),
  enabled: z.boolean(), auth: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("oauth"), clientId: z.string().optional() }),
    z.object({ kind: z.literal("header"), name: z.string() })
  ]),
  // Connectors saved before access could be limited reach every thread; an unreadable rule falls back to that too.
  access: connectorAccessSchema.optional().catch(undefined), secrets: z.string() });
const fileSchema = z.object({ version: z.literal(1), connectors: z.array(storedConnectorSchema) });
/** Each part is checked on its own, so one unreadable value (say, tokens from an older format) costs only a sign-in, not the connector. */
const secretsSchema = z.object({
  requiresSignIn: z.boolean().optional().catch(undefined),
  headerValue: z.string().optional().catch(undefined),
  clientSecret: z.string().optional().catch(undefined),
  discovery: z.object({ authorizationServerUrl: z.string().url(), resourceMetadataUrl: z.string().url().optional(),
    authorizationServerMetadata: z.union([OAuthMetadataSchema, OpenIdProviderMetadataSchema]).optional(),
    resourceMetadata: OAuthProtectedResourceMetadataSchema.optional() }).optional().catch(undefined),
  client: z.object({ information: z.union([OAuthClientInformationFullSchema, OAuthClientInformationSchema]), redirectUri: z.string() }).optional().catch(undefined),
  tokens: z.object({ tokens: OAuthTokensSchema, savedAt: z.number() }).optional().catch(undefined)
});
type StoredRecord = z.infer<typeof storedConnectorSchema>;

/** Drops keys explicitly set to undefined, which is how a patch removes a secret. */
function compact(secrets: ConnectorSecrets): ConnectorSecrets {
  const { headerValue, clientSecret, client, tokens, discovery, requiresSignIn } = secrets;
  return { ...(headerValue !== undefined ? { headerValue } : {}), ...(clientSecret !== undefined ? { clientSecret } : {}),
    ...(client ? { client } : {}), ...(tokens ? { tokens } : {}), ...(discovery ? { discovery } : {}), ...(requiresSignIn ? { requiresSignIn } : {}) };
}

/**
 * Connectors live in one JSON file in Nora's state directory. Configuration is stored in the clear; everything secret
 * (header values, OAuth clients and tokens) is one encrypted value per connector. Writes replace the file atomically.
 */
export function openConnectorStore({ path, codec }: ConnectorStoreOptions): ConnectorStore {
  let records = read();

  function read(): StoredRecord[] {
    try { return fileSchema.parse(JSON.parse(readFileSync(path, "utf8"))).connectors; }
    catch (error) {
      if (!isNodeError(error) || error.code !== "ENOENT") console.error("Connectors could not be read; starting without them", error);
      return [];
    }
  }
  function write(next: StoredRecord[]): void {
    mkdirSync(dirname(path), { recursive: true });
    const temporary = `${path}.tmp`;
    writeFileSync(temporary, JSON.stringify({ version: 1, connectors: next }, null, 2), { encoding: "utf8", mode: 0o600 });
    renameSync(temporary, path);
    records = next;
  }
  const encode = (secrets: ConnectorSecrets): string => codec.encrypt(JSON.stringify(secrets));
  function decode(stored: string): ConnectorSecrets {
    const plain = codec.decrypt(stored);
    if (!plain) return {};
    try {
      return compact(secretsSchema.parse(JSON.parse(plain)));
    } catch { return {}; }
  }
  const strip = ({ secrets: _secrets, access, ...connector }: StoredRecord): StoredConnector => ({ ...connector, access: access ?? CONNECTOR_ACCESS_ALL });
  const replace = (id: string, change: (record: StoredRecord) => StoredRecord): void => {
    if (!records.some((record) => record.id === id)) throw new Error("This connector no longer exists.");
    write(records.map((record) => record.id === id ? change(record) : record));
  };

  return {
    list: () => records.map(strip),
    get(id) { const record = records.find((entry) => entry.id === id); return record ? strip(record) : undefined; },
    add(connector, secrets) { write([...records, { ...connector, secrets: encode(secrets) }]); },
    update(id, patch) { replace(id, (record) => ({ ...record, ...patch })); },
    remove(id) { write(records.filter((record) => record.id !== id)); },
    secrets(id) { const record = records.find((entry) => entry.id === id); return record ? decode(record.secrets) : {}; },
    updateSecrets(id, patch) {
      replace(id, (record) => {
        return { ...record, secrets: encode(compact({ ...decode(record.secrets), ...patch })) };
      });
    }
  };
}
