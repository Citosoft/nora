/** Turns a secret into its at-rest form and back; injected so stores can be tested without the OS keychain. */
export interface SecretCodec {
  encrypt(secret: string): string;
  decrypt(stored: string): string;
}
