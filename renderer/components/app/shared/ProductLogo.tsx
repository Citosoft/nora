import { productFaviconUrl } from "@/components/app/logic/productIcon";
import { ProductIcon } from "@/components/app/shared/ProductIcon";
import type { ProductLogoProps } from "@/components/app/types/productIcon.types";
import { cn } from "@/lib/utils";

/** A brand's icon in the small framed tile used beside names in pickers and lists. Decorative: the adjacent name carries meaning. */
export function ProductLogo({ domain, className, imgClassName }: ProductLogoProps) {
  return (
    <div
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-md bg-background ring-1 ring-border/50",
        className
      )}
    >
      <ProductIcon sourceUrl={productFaviconUrl(domain)} alt="" className={cn("size-3.5 object-contain", imgClassName)} aria-hidden />
    </div>
  );
}
