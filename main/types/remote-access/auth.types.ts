export interface RemoteIdentity {
  userId: string;
  sessionId: string;
  expiresAt: number;
}
export interface RemoteTokenVerifier {
  verify(token: string): Promise<RemoteIdentity>;
}
export interface RemoteAuthOptions {
  issuer: string;
  origins: readonly string[];
  fetch?: typeof fetch;
  now?: () => number;
}
