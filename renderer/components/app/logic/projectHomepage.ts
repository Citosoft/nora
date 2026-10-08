import { productFaviconUrl } from "@/components/app/logic/productIcon";

const IPV4_HOSTNAME = /^\d{1,3}(\.\d{1,3}){3}$/;

function parseWebUrl(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * Only public, dotted hostnames go to the favicon service: localhost, bare
 * intranet names, and IP literals would resolve to its generic placeholder
 * icon and hide the framework-logo fallback.
 */
function isPublicHostname(hostname: string): boolean {
  return hostname.includes(".") && !IPV4_HOSTNAME.test(hostname) && !hostname.startsWith("[");
}

/** Reads the npm `homepage` field from raw `package.json` text as a normalized http(s) URL. */
export function parsePackageJsonHomepageUrl(packageJsonText: string): string | null {
  try {
    const parsed: unknown = JSON.parse(packageJsonText);
    if (typeof parsed !== "object" || parsed === null || !("homepage" in parsed)) {
      return null;
    }
    const { homepage } = parsed;
    return typeof homepage === "string" ? parseWebUrl(homepage)?.href ?? null : null;
  } catch {
    return null;
  }
}

export function resolveHomepageFaviconUrl(homepageUrl: string): string | null {
  const url = parseWebUrl(homepageUrl);
  const hostname = url?.hostname.toLowerCase() ?? "";
  return isPublicHostname(hostname) ? productFaviconUrl(hostname) : null;
}

/** Compact display form: host plus path, without protocol or trailing slash. */
export function formatHomepageLabel(homepageUrl: string): string {
  const url = parseWebUrl(homepageUrl);
  if (!url) {
    return homepageUrl;
  }
  return `${url.host}${url.pathname}${url.search}${url.hash}`.replace(/\/$/, "");
}
