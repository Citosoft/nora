export const PUBLIC_RELEASE_REPOSITORY = "Citosoft/nora";

export function getPublicReleaseUrl(tagName: string): string {
  return `https://github.com/${PUBLIC_RELEASE_REPOSITORY}/releases/tag/${tagName}`;
}

export function getLatestPublicReleaseUrl(): string {
  return `https://github.com/${PUBLIC_RELEASE_REPOSITORY}/releases/latest`;
}

export function getLatestPublicReleaseApiUrl(): string {
  return `https://api.github.com/repos/${PUBLIC_RELEASE_REPOSITORY}/releases/latest`;
}
