import { describe, expect, it } from "vitest";
import { authenticate, extractBearerToken, issuerFromPublishableKey } from "../src/auth";
import { createFakeVerifier, TOKENS, USER_A } from "./fakes/harness";

function withAuthorization(value: string | null): Request {
  const headers = new Headers();
  if (value !== null) headers.set("Authorization", value);
  return new Request("https://remote-api.withnora.run/v1/runtimes", { headers });
}

describe("extractBearerToken", () => {
  it("accepts a compact JWS", () => {
    expect(extractBearerToken("Bearer a.b.c")).toBe("a.b.c");
  });

  it.each([null, "", "Bearer", "Bearer ", "bearer a.b.c", "Bearer a.b", "Bearer a.b.c.d", "Bearer a b.c", `Bearer ${"a".repeat(9000)}.b.c`])(
    "rejects %j",
    (header) => {
      expect(extractBearerToken(header)).toBeNull();
    }
  );
});

describe("authenticate", () => {
  it("returns the verified user ID", async () => {
    expect(await authenticate(withAuthorization(`Bearer ${TOKENS.userA}`), createFakeVerifier())).toBe(USER_A);
  });

  it("returns null when the verifier throws", async () => {
    expect(await authenticate(withAuthorization(`Bearer ${TOKENS.throws}`), createFakeVerifier())).toBeNull();
  });

  it("returns null when the verifier yields an empty subject", async () => {
    const verifier = { verify: async () => ({ userId: "", authorizedParty: null }) };
    expect(await authenticate(withAuthorization("Bearer a.b.c"), verifier)).toBeNull();
  });

  it("does not call the verifier for a malformed header", async () => {
    let called = false;
    const verifier = {
      verify: async () => {
        called = true;
        return { userId: USER_A, authorizedParty: null };
      }
    };
    expect(await authenticate(withAuthorization("Token abc"), verifier)).toBeNull();
    expect(called).toBe(false);
  });
});

describe("issuerFromPublishableKey", () => {
  it("decodes the Frontend API host", () => {
    const key = `pk_live_${btoa("clerk.withnora.run$")}`;
    expect(issuerFromPublishableKey(key)).toBe("https://clerk.withnora.run");
  });

  it.each(["pk_live_", "sk_live_abc", `pk_test_${btoa("no-dollar.example")}`, `pk_test_${btoa("bad host/$")}`])("rejects %j", (key) => {
    expect(() => issuerFromPublishableKey(key)).toThrow();
  });
});
