import assert from "node:assert/strict";
import test from "node:test";
import { connectorConnectionError } from "@main/connectors/connectionError";

const url = "https://mcp.example.com/mcp";

test("fetch DNS failures name the hostname and suggest checking DNS or VPN", () => {
  for (const code of ["ENOTFOUND", "EAI_AGAIN"]) {
    const error = new TypeError("fetch failed", { cause: Object.assign(new Error("getaddrinfo"), { code }) });
    assert.match(connectorConnectionError(error, url) ?? "", /could not resolve mcp\.example\.com.*DNS or VPN/);
  }
});

test("socket refusals and timeouts explain how to retry", () => {
  assert.match(connectorConnectionError(Object.assign(new Error(), { code: "ECONNREFUSED" }), url) ?? "", /refused the connection/);
  assert.match(connectorConnectionError(Object.assign(new Error(), { code: "UND_ERR_CONNECT_TIMEOUT" }), url) ?? "", /timed out/);
});

test("other failures retain their existing OAuth or transport messages", () => {
  assert.equal(connectorConnectionError(new Error("invalid_client"), url), null);
  assert.equal(connectorConnectionError(null, url), null);
});

test("certificate failures distinguish trust, expiry and hostname problems", () => {
  const message = (code: string) => connectorConnectionError(new TypeError("fetch failed", { cause: Object.assign(new Error(), { code }) }), url) ?? "";
  assert.match(message("SELF_SIGNED_CERT_IN_CHAIN"), /certificate authority in your system trust store/);
  assert.match(message("CERT_HAS_EXPIRED"), /has expired/);
  assert.match(message("ERR_TLS_CERT_ALTNAME_INVALID"), /does not match mcp\.example\.com/);
});
