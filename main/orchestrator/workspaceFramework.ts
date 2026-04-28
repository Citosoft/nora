import type { WorkspaceFramework } from "@shared/appTypes";
import type { WorkspaceTarget } from "../types/internal.types";

type WorkspacePackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type ReadWorkspaceTextFile = (
  target: WorkspaceTarget,
  rootPath: string,
  relativePath: string
) => Promise<string>;

const FRAMEWORK_DETECTORS: Array<{
  packageName: string;
  id: WorkspaceFramework["id"];
  label: WorkspaceFramework["label"];
  logoUrl: WorkspaceFramework["logoUrl"];
}> = [
  { packageName: "next", id: "nextjs", label: "Next.js", logoUrl: "https://cdn.simpleicons.org/nextdotjs" },
  { packageName: "astro", id: "astro", label: "Astro", logoUrl: "https://cdn.simpleicons.org/astro" },
  { packageName: "electron", id: "electron", label: "Electron", logoUrl: "https://cdn.simpleicons.org/electron" },
  { packageName: "@sveltejs/kit", id: "sveltekit", label: "SvelteKit", logoUrl: "https://cdn.simpleicons.org/svelte" },
  { packageName: "nuxt", id: "nuxt", label: "Nuxt", logoUrl: "https://cdn.simpleicons.org/nuxt" },
  { packageName: "@remix-run/react", id: "remix", label: "Remix", logoUrl: "https://cdn.simpleicons.org/remix" },
  { packageName: "vite", id: "vite", label: "Vite", logoUrl: "https://cdn.simpleicons.org/vite" },
  { packageName: "react", id: "react", label: "React", logoUrl: "https://cdn.simpleicons.org/react" },
  { packageName: "vue", id: "vue", label: "Vue", logoUrl: "https://cdn.simpleicons.org/vuedotjs" }
];

export async function detectWorkspaceFramework(
  target: WorkspaceTarget,
  readWorkspaceTextFile: ReadWorkspaceTextFile
): Promise<WorkspaceFramework | null> {
  try {
    const packageJsonRaw = await readWorkspaceTextFile(target, "", "package.json");
    const packageJson = JSON.parse(packageJsonRaw) as WorkspacePackageJson;
    const deps = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {})
    };

    for (const detector of FRAMEWORK_DETECTORS) {
      const version = deps[detector.packageName];
      if (typeof version !== "string") {
        continue;
      }
      return {
        id: detector.id,
        label: detector.label,
        logoUrl: detector.logoUrl,
        version
      };
    }

    return null;
  } catch {
    return null;
  }
}
