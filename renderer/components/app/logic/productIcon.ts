import type { ProductIconSources } from "@/components/app/types/productIcon.types";

const GOOGLE_FAVICON_HOST = "www.google.com";
const GOOGLE_FAVICON_PATH = "/s2/favicons";
const PRODUCT_ICON_DIRECTORY = "product-icons";

export function productFaviconUrl(domain: string): string {
  return `https://${GOOGLE_FAVICON_HOST}${GOOGLE_FAVICON_PATH}?domain=${domain}&sz=64`;
}

export function resolveProductIconDomain(sourceUrl: string): string | null {
  try {
    const url = new URL(sourceUrl);
    if (url.hostname !== GOOGLE_FAVICON_HOST || url.pathname !== GOOGLE_FAVICON_PATH) {
      return null;
    }

    const domain = url.searchParams.get("domain")?.trim().toLowerCase() ?? "";
    return /^[a-z0-9.-]+$/.test(domain) ? domain : null;
  } catch {
    return null;
  }
}

export function resolveProductIconSources(sourceUrl: string): ProductIconSources {
  const domain = resolveProductIconDomain(sourceUrl);
  return {
    localUrl: domain ? `./${PRODUCT_ICON_DIRECTORY}/${domain}.png` : null,
    remoteUrl: sourceUrl
  };
}
