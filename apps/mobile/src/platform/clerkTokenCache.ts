import { tokenCache } from "@clerk/expo/token-cache";
import type { TokenCache } from "@clerk/expo";

/** Native: Clerk's SecureStore-backed cache keeps the session in the device keychain/keystore. */
export const clerkTokenCache: TokenCache | undefined = tokenCache;
