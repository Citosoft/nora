/** Claims the Worker relies on after a session token passed signature, issuer and expiry checks. */
export interface VerifiedSessionClaims {
  readonly userId: string;
  readonly authorizedParty: string | null;
}

/** Verifies a raw bearer token. Must throw on any verification failure. */
export interface SessionTokenVerifier {
  verify(token: string): Promise<VerifiedSessionClaims>;
}

export interface ClerkVerifierOptions {
  readonly secretKey: string;
  readonly publishableKey: string;
  readonly authorizedParties: readonly string[];
}
