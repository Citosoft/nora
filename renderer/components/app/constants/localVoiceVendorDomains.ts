import type { LocalVoiceModelVendor } from "@shared/appTypes";

/** Logo domains for local voice model makers; scripts/fetch-product-icons.mjs bundles each one. */
export const LOCAL_VOICE_VENDOR_DOMAINS: Readonly<Record<LocalVoiceModelVendor, string>> = {
  openai: "openai.com",
  nvidia: "nvidia.com"
};
