import { runtimeHostnameSchema } from "@shared/remote-access/directory";

/** Builds the runtime's HTTPS origin, refusing anything that is not a bare hostname (no scheme, path or port). */
export function runtimeOrigin(hostname: string): string {
  return `https://${runtimeHostnameSchema.parse(hostname)}`;
}

export function runtimeRealtimeOrigin(hostname: string): string {
  return `wss://${runtimeHostnameSchema.parse(hostname)}`;
}

export function withQuery(path: string, query: Readonly<Record<string, string | number | undefined>>): string {
  const params = Object.entries(query).filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return params.length ? `${path}?${params.join("&")}` : path;
}
