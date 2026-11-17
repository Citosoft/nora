import type { TokenCache } from "@clerk/expo";

/** Web: Clerk manages its own session (cookies on the Clerk frontend API); no custom token storage. */
export const clerkTokenCache: TokenCache | undefined = undefined;
