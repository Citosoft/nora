export type WorkspaceProjectIconMode = "project-favicon" | "framework-logo" | "fallback";

export type WorkspaceProjectIconModeArgs = {
  projectFaviconUrl?: string | null;
  projectFaviconFailed: boolean;
  frameworkLogoUrl?: string | null;
  frameworkLogoFailed: boolean;
};

function hasUsableImageUrl(url: string | null | undefined): boolean {
  return typeof url === "string" && url.trim().length > 0;
}

export function resolveWorkspaceProjectIconMode({
  projectFaviconUrl,
  projectFaviconFailed,
  frameworkLogoUrl,
  frameworkLogoFailed
}: WorkspaceProjectIconModeArgs): WorkspaceProjectIconMode {
  if (hasUsableImageUrl(projectFaviconUrl) && !projectFaviconFailed) {
    return "project-favicon";
  }

  if (hasUsableImageUrl(frameworkLogoUrl) && !frameworkLogoFailed) {
    return "framework-logo";
  }

  return "fallback";
}

export function shouldInvertFrameworkLogoInDarkMode(frameworkId: string | null | undefined): boolean {
  const normalized = frameworkId?.trim().toLowerCase() ?? "";
  return normalized === "nextjs" || normalized === "next";
}
