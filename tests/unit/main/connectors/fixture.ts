import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type test from "node:test";
import { openConnectorStore } from "@main/connectors/store";
import type { SecretCodec } from "@main/types/secretEncryption.types";
import type { ConnectorStore } from "@main/types/connectors/connectors.types";

/** Marks values as "encrypted" so tests can see secrets never reach the file in the clear. */
export const testCodec: SecretCodec = {
  encrypt: (secret) => `enc:${Buffer.from(secret).toString("base64")}`,
  decrypt: (stored) => stored.startsWith("enc:") ? Buffer.from(stored.slice(4), "base64").toString("utf8") : ""
};

export function storeFixture(t: test.TestContext): { store: ConnectorStore; path: string; reopen(): ConnectorStore } {
  const directory = mkdtempSync(join(tmpdir(), "nora-connectors-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "connectors.json");
  return { store: openConnectorStore({ path, codec: testCodec }), path, reopen: () => openConnectorStore({ path, codec: testCodec }) };
}

export async function until(check: () => boolean, label: string, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
