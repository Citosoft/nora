import { safeStorage } from "electron";
import type { SecretCodec } from "@main/types/secretEncryption.types";

const ENCRYPTED_SECRET_PREFIX = "enc:v1:";

/**
 * Encrypts secrets at rest with the OS keychain via Electron's safeStorage. Where the platform offers no encryption the
 * secret is stored as given, and an encrypted value that can no longer be decrypted reads back as empty.
 */
export const safeStorageSecretCodec: SecretCodec = {
  encrypt(secret) {
    if (!secret || !safeStorage.isEncryptionAvailable()) return secret;
    return `${ENCRYPTED_SECRET_PREFIX}${safeStorage.encryptString(secret).toString("base64")}`;
  },
  decrypt(secret) {
    if (!secret.startsWith(ENCRYPTED_SECRET_PREFIX)) return secret;
    const encoded = secret.slice(ENCRYPTED_SECRET_PREFIX.length);
    if (!encoded || !safeStorage.isEncryptionAvailable()) return "";
    try { return safeStorage.decryptString(Buffer.from(encoded, "base64")); } catch { return ""; }
  }
};
