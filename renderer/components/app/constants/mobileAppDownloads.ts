import type { MobileAppDownload } from "@/components/app/types/remoteAccess.types";

/** Where to get the phone app. iPhone ships as a TestFlight public beta for now; add Android here when it lists. */
export const MOBILE_APP_DOWNLOADS: readonly MobileAppDownload[] = [
  { platform: "ios", label: "Get the iPhone app", channel: "Public beta on TestFlight", url: "https://testflight.apple.com/join/bJkZ9FuE" }
];
