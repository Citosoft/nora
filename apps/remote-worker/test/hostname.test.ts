import { runtimeHostnameSchema } from "@shared/remote-access/directory";
import { describe, expect, it } from "vitest";
import { base32Encode, deriveRuntimeHostname, deriveRuntimeLabel, RUNTIME_LABEL_LENGTH } from "../src/hostname";

const SECRET = "hostname-secret-for-tests-0123456789";

describe("base32Encode", () => {
  it.each([
    ["", ""],
    ["f", "my"],
    ["fo", "mzxq"],
    ["foo", "mzxw6"],
    ["foob", "mzxw6yq"],
    ["fooba", "mzxw6ytb"],
    ["foobar", "mzxw6ytboi"]
  ])("matches the RFC 4648 vector for %j (lowercase, unpadded)", (input, expected) => {
    expect(base32Encode(new TextEncoder().encode(input))).toBe(expected);
  });
});

describe("deriveRuntimeLabel", () => {
  it("is deterministic", async () => {
    const a = await deriveRuntimeLabel(SECRET, "user_1", "install-aaaaaaaaaaaaaaaa");
    const b = await deriveRuntimeLabel(SECRET, "user_1", "install-aaaaaaaaaaaaaaaa");
    expect(a).toBe(b);
  });

  it("has the expected length and charset", async () => {
    const label = await deriveRuntimeLabel(SECRET, "user_1", "install-aaaaaaaaaaaaaaaa");
    expect(label).toHaveLength(RUNTIME_LABEL_LENGTH);
    expect(RUNTIME_LABEL_LENGTH).toBeGreaterThanOrEqual(26);
    expect(label).toMatch(/^[a-z2-7]+$/);
  });

  it("changes with the user, the installation and the secret", async () => {
    const base = await deriveRuntimeLabel(SECRET, "user_1", "install-aaaaaaaaaaaaaaaa");
    expect(await deriveRuntimeLabel(SECRET, "user_2", "install-aaaaaaaaaaaaaaaa")).not.toBe(base);
    expect(await deriveRuntimeLabel(SECRET, "user_1", "install-bbbbbbbbbbbbbbbb")).not.toBe(base);
    expect(await deriveRuntimeLabel(`${SECRET}x`, "user_1", "install-aaaaaaaaaaaaaaaa")).not.toBe(base);
  });

  it("produces hostnames accepted by the shared contract", async () => {
    const hostname = await deriveRuntimeHostname(SECRET, "remote.withnora.run", "user_1", "install-aaaaaaaaaaaaaaaa");
    expect(hostname.endsWith(".remote.withnora.run")).toBe(true);
    expect(runtimeHostnameSchema.safeParse(hostname).success).toBe(true);
  });
});
