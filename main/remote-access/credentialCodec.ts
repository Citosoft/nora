import { createKeychainOnlyCodec } from "@main/helpers/secretEncryption";
import { NORA_RELAY_NAME } from "@shared/remote-access/constants";

/** Remote connector credentials must never fall back to plaintext or Linux's basic_text backend. */
export const remoteCredentialCodec = createKeychainOnlyCodec({
  unavailable: `Secure credential storage is unavailable. Unlock your system keychain before enabling ${NORA_RELAY_NAME}.`,
  locked: `Unlock your system keychain and try ${NORA_RELAY_NAME} again.`,
  unreadable: "The saved connection could not be unlocked. Retry to recover its credentials."
});
