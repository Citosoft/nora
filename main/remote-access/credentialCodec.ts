import { createKeychainOnlyCodec } from "@main/helpers/secretEncryption";

/** Remote connector credentials must never fall back to plaintext or Linux's basic_text backend. */
export const remoteCredentialCodec = createKeychainOnlyCodec({
  unavailable: "Secure credential storage is unavailable. Unlock your system keychain before enabling remote access.",
  locked: "Unlock your system keychain and retry remote access.",
  unreadable: "The saved connection could not be unlocked. Retry to recover its credentials."
});
