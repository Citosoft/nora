import { safeStorage } from "electron";
import type { SecretCodec } from "@main/types/secretEncryption.types";

/** Remote connector credentials must never fall back to plaintext or Linux's basic_text backend. */
export const remoteCredentialCodec: SecretCodec = {
  encrypt(token) {
    if (!safeStorage.isEncryptionAvailable() || (process.platform === "linux" && safeStorage.getSelectedStorageBackend() === "basic_text")) {
      throw new Error("Secure credential storage is unavailable. Unlock your system keychain before enabling remote access.");
    }
    return `enc:v1:${safeStorage.encryptString(token).toString("base64")}`;
  },
  decrypt(stored) {
    if (!stored.startsWith("enc:v1:") || !safeStorage.isEncryptionAvailable()) throw new Error("Unlock your system keychain and retry remote access.");
    try { return safeStorage.decryptString(Buffer.from(stored.slice(7), "base64")); }
    catch { throw new Error("The saved connection could not be unlocked. Retry to recover its credentials."); }
  }
};
