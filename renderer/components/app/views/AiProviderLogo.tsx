import { cn } from "@/lib/utils";
import type { AiProvider } from "@shared/appTypes";

const DOMAIN_BY_PROVIDER: Record<AiProvider, string> = {
  openai: "openai.com",
  google: "gemini.google.com",
  anthropic: "anthropic.com"
};

export function aiProviderLogoUrl(provider: AiProvider): string {
  return `https://www.google.com/s2/favicons?domain=${DOMAIN_BY_PROVIDER[provider]}&sz=64`;
}

export function AiProviderLogo({
  provider,
  className,
  imgClassName
}: {
  provider: AiProvider;
  className?: string;
  imgClassName?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-background/70 ring-1 ring-border/50",
        className
      )}
    >
      <img
        src={aiProviderLogoUrl(provider)}
        alt=""
        className={cn("size-3.5 object-contain", imgClassName)}
        aria-hidden
      />
    </div>
  );
}
