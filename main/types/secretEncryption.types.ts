/** Turns a secret into its at-rest form and back; injected so stores can be tested without the OS keychain. */
export interface SecretCodec {
  encrypt(secret: string): string;
  decrypt(stored: string): string;
}
/** What a keychain-only codec tells the user when it refuses, in the words of the feature that owns the secret. */
export interface KeychainCodecMessages {
  /** No OS keychain can encrypt right now. */
  unavailable: string;
  /** A stored value cannot be read until the keychain is unlocked. */
  locked: string;
  /** The keychain is open but the stored value no longer decrypts. */
  unreadable: string;
}
