import assert from "node:assert/strict";
import test from "node:test";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { bearerToken, createRemoteTokenVerifier } from "@main/remote-access/auth";

test("Clerk authentication verifies signature, fixed issuer, owner claims, expiry and authorized party", async () => {
  const keys = await generateKeyPair("RS256");
  const publicKey = await exportJWK(keys.publicKey);
  const now = Date.parse("2026-11-16T10:00:00Z"); const seconds = Math.floor(now / 1000);
  const verifier = createRemoteTokenVerifier({ issuer: "https://account.clerk.accounts.dev", origins: ["https://app.withnora.run"], now: () => now,
    fetch: async (url) => { assert.equal(String(url), "https://account.clerk.accounts.dev/.well-known/jwks.json"); return Response.json({ keys: [{ ...publicKey, kid: "key", alg: "RS256", use: "sig" }] }); } });
  const token = (changes: Record<string, string | number> = {}) => new SignJWT({ sub: "owner", sid: "session", iat: seconds, exp: seconds + 60, iss: "https://account.clerk.accounts.dev", azp: "https://app.withnora.run", ...changes })
    .setProtectedHeader({ alg: "RS256", kid: "key" }).sign(keys.privateKey);
  const valid = await token();
  assert.equal((await verifier.verify(valid)).userId, "owner");
  const alterations: Array<Record<string, string | number>> = [{ iss: "https://other.clerk.accounts.dev" }, { azp: "https://evil.example" }, { exp: seconds - 10 }, { exp: seconds + 3600 }, { sid: "" }];
  for (const changes of alterations) {
    await assert.rejects(verifier.verify(await token(changes)));
  }
  const parts = valid.split("."); parts[2] = `${parts[2].startsWith("a") ? "b" : "a"}${parts[2].slice(1)}`;
  await assert.rejects(verifier.verify(parts.join(".")));
  assert.equal(bearerToken(`Bearer ${valid}`), valid);
  assert.equal(bearerToken("Bearer native-client-token"), null);
  assert.equal(bearerToken(`Bearer ${"x".repeat(9000)}`), null);
});
