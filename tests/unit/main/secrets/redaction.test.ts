import assert from "node:assert/strict";
import test from "node:test";
import { redactSecrets } from "@main/secrets/redaction";

test("a secret is redacted wherever a command prints it, raw or in a common encoding", () => {
  const value = "p@ss w0rd/+=";
  const secrets = new Map([["DB_PASSWORD", value]]);
  const bytes = Buffer.from(value);
  const output = [`raw ${value}`, `b64 ${bytes.toString("base64")}`, `url ${encodeURIComponent(value)}`, `hex ${bytes.toString("hex")}`, `json ${JSON.stringify(value)}`].join("\n");
  const redacted = redactSecrets(output, secrets);
  assert.equal(redacted.split("[DB_PASSWORD redacted]").length - 1, 5);
  for (const form of [value, bytes.toString("base64"), encodeURIComponent(value), bytes.toString("hex")]) assert.equal(redacted.includes(form), false);
});

test("each secret gets its own marker, the longer value first, and other output is untouched", () => {
  const secrets = new Map([["SHORT", "abc"], ["LONG", "abc-and-more"]]);
  assert.equal(redactSecrets("abc-and-more then abc; exit 0", secrets), "[LONG redacted] then [SHORT redacted]; exit 0");
  assert.equal(redactSecrets("nothing secret here", secrets), "nothing secret here");
});

test("the lines of a multi-line secret are redacted on their own", () => {
  const key = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----";
  const redacted = redactSecrets("loaded MIIEvQIBADANBgkqhkiG9w0BAQEFAASC ok", new Map([["SIGNING_KEY", key]]));
  assert.equal(redacted, "loaded [SIGNING_KEY redacted] ok");
});
