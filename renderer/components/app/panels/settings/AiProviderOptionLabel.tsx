import { AiProviderLogo } from "@/components/app/views/AiProviderLogo";
import type { AiProviderOptionLabelProps } from "@/components/app/types/modelPicker.types";

export function AiProviderOptionLabel({ provider, label }: AiProviderOptionLabelProps) {
  return <span className="inline-flex min-w-0 items-center gap-2">
    <AiProviderLogo provider={provider} />
    <span className="truncate">{label}</span>
  </span>;
}
