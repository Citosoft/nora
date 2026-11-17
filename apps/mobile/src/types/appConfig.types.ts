export interface AppConfig {
  /** Null when `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is unset: the app shows a configuration message instead of signing in. */
  clerkPublishableKey: string | null;
  controlPlaneUrl: string;
}
