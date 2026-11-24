import { ProductLogo } from "@/components/app/shared/ProductLogo";
import type { AiProvider } from "@shared/appTypes";

const DOMAIN_BY_PROVIDER: Record<AiProvider, string> = {
  openai: "openai.com",
  google: "gemini.google.com",
  anthropic: "anthropic.com"
};

export function AiProviderLogo({
  provider,
  className,
  imgClassName
}: {
  provider: AiProvider;
  className?: string;
  imgClassName?: string;
}) {
  return <ProductLogo domain={DOMAIN_BY_PROVIDER[provider]} className={className} imgClassName={imgClassName} />;
}
