import type { ForgeRepoSummary } from "@shared/appTypes";

export const normalizeForgeRemoteUrl = (remoteUrl: string): string => remoteUrl.trim().replace(/\.git$/i, "");

export const parseForgeRepoSummary = (remoteUrl: string): ForgeRepoSummary | null => {
  const normalized = normalizeForgeRemoteUrl(remoteUrl);
  let url: URL;

  if (/^[^@]+@[^:]+:.+/.test(normalized)) {
    const match = normalized.match(/^[^@]+@([^:]+):(.+)$/);
    if (!match) {
      return null;
    }
    url = new URL(`ssh://${match[1]}/${match[2]}`);
  } else {
    try {
      url = new URL(normalized);
    } catch {
      return null;
    }
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const host = url.host.toLowerCase();
  const name = segments[segments.length - 1];
  const owner = segments.slice(0, -1).join("/");
  const fullName = `${owner}/${name}`;
  const provider =
    host === "github.com" || host.endsWith(".github.com")
      ? "github"
      : host === "gitlab.com" || host.includes("gitlab")
        ? "gitlab"
        : null;

  if (!provider) {
    return null;
  }

  return {
    provider,
    host,
    owner,
    name,
    fullName,
    webUrl: `https://${host}/${fullName}`
  };
};
