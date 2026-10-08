import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { parsePackageJsonHomepageUrl, resolveHomepageFaviconUrl } from "@/components/app/logic/projectHomepage";
import type { WorkspaceProjectBranding } from "@/components/app/types/workspaceProjectBranding.types";

const PROJECT_FAVICON_CANDIDATE_PATHS: readonly string[] = [
  "favicon.ico",
  "favicon.png",
  "favicon.svg",
  "public/favicon.ico",
  "public/favicon.png",
  "public/favicon.svg",
  "src/favicon.ico",
  "src/favicon.png",
  "src/favicon.svg",
  "app/favicon.ico",
  "app/favicon.png",
  "app/favicon.svg"
];

async function resolveLocalFaviconDataUrl(projectId: string, rootPath: string): Promise<string | null> {
  for (const candidatePath of PROJECT_FAVICON_CANDIDATE_PATHS) {
    try {
      const stat = await noraWorkspaceClient.statWorkspacePath({
        projectId,
        rootPath,
        path: candidatePath
      });
      if (!stat.exists || stat.kind !== "file") {
        continue;
      }
      const image = await noraWorkspaceClient.readWorkspaceImageFile({
        projectId,
        rootPath,
        path: candidatePath
      });
      if (image.dataUrl.trim().length > 0) {
        return image.dataUrl;
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function readPackageJsonHomepageUrl(projectId: string, rootPath: string): Promise<string | null> {
  try {
    const packageJsonText = await noraWorkspaceClient.readWorkspaceFile({
      projectId,
      rootPath,
      path: "package.json"
    });
    return parsePackageJsonHomepageUrl(packageJsonText);
  } catch {
    return null;
  }
}

/**
 * Prefers a favicon checked into the project; otherwise falls back to the
 * favicon of the `package.json` homepage, if one is declared.
 */
export async function resolveWorkspaceProjectBranding(projectId: string, rootPath: string): Promise<WorkspaceProjectBranding> {
  const [localFaviconUrl, homepageUrl] = await Promise.all([
    resolveLocalFaviconDataUrl(projectId, rootPath),
    readPackageJsonHomepageUrl(projectId, rootPath)
  ]);
  return {
    faviconUrl: localFaviconUrl ?? (homepageUrl ? resolveHomepageFaviconUrl(homepageUrl) : null),
    homepageUrl
  };
}
