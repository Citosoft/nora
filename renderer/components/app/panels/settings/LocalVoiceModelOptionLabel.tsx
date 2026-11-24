import { LOCAL_VOICE_VENDOR_DOMAINS } from "@/components/app/constants/localVoiceVendorDomains";
import { ProductLogo } from "@/components/app/shared/ProductLogo";
import type { LocalVoiceModelOptionLabelProps } from "@/components/app/types/modelPicker.types";

export function LocalVoiceModelOptionLabel({ model }: LocalVoiceModelOptionLabelProps) {
  return <span className="inline-flex min-w-0 items-center gap-2">
    <ProductLogo domain={LOCAL_VOICE_VENDOR_DOMAINS[model.vendor]} />
    <span className="truncate">{model.name}</span>
  </span>;
}
