const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";
/** 32 base32 characters carry 160 bits of the HMAC: unguessable, and well inside the 63-char DNS label limit. */
export const RUNTIME_LABEL_LENGTH = 32;

/** RFC 4648 base32, lowercase, without padding. */
export function base32Encode(bytes: Uint8Array): string {
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
    buffer &= (1 << bits) - 1;
  }
  if (bits > 0) output += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  return output;
}

/**
 * Stable per (user, installation) and unguessable without the secret, so re-provisioning or recreating a tunnel
 * keeps the same public hostname while hostnames reveal nothing about the account.
 */
export async function deriveRuntimeLabel(secret: string, userId: string, installationId: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`${userId}:${installationId}`));
  return base32Encode(new Uint8Array(digest)).slice(0, RUNTIME_LABEL_LENGTH);
}

export async function deriveRuntimeHostname(secret: string, suffix: string, userId: string, installationId: string): Promise<string> {
  return `${await deriveRuntimeLabel(secret, userId, installationId)}.${suffix}`;
}
