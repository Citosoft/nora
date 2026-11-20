import { safeStorage } from "electron";
import type { KeychainCodecMessages, SecretCodec } from "@main/types/secretEncryption.types";

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

/** Linux falls back to a hardcoded key ("basic_text") when no keyring is running, which protects nothing. */
const keychainEncrypts = (): boolean => safeStorage.isEncryptionAvailable()
  && !(process.platform === "linux" && safeStorage.getSelectedStorageBackend() === "basic_text");

/**
 * For secrets that must never rest in plaintext: the key lives in the OS keychain (macOS Keychain, Windows DPAPI, the Linux
 * Secret Service or KWallet), and encrypting or decrypting without one throws instead of degrading.
 */
export function createKeychainOnlyCodec(messages: KeychainCodecMessages): SecretCodec {
  return {
    encrypt(secret) {
      if (!keychainEncrypts()) throw new Error(messages.unavailable);
      return `${ENCRYPTED_SECRET_PREFIX}${safeStorage.encryptString(secret).toString("base64")}`;
    },
    decrypt(stored) {
      if (!stored.startsWith(ENCRYPTED_SECRET_PREFIX) || !safeStorage.isEncryptionAvailable()) throw new Error(messages.locked);
      try { return safeStorage.decryptString(Buffer.from(stored.slice(ENCRYPTED_SECRET_PREFIX.length), "base64")); }
      catch { throw new Error(messages.unreadable); }
    }
  };
}
