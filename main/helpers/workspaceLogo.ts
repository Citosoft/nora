/**
 * Ranks files in a workspace listing that look like the project's own logo, best first.
 * Pure so the heuristic stays testable apart from filesystem and SSH access.
 */
const IMAGE_EXTENSIONS = ["svg", "png", "webp", "ico", "jpg", "jpeg"] as const;
/** Generated, vendored and sample trees hold other projects' artwork, never this project's logo. */
const EXCLUDED_SEGMENTS = new Set([
  "node_modules", "bower_components", "vendor", "third_party", "third-party", "dist", "out", "build-output", "coverage",
  ".next", ".nuxt", ".svelte-kit", ".turbo", ".cache", "target", "pods", "deriveddata", "test", "tests", "__tests__",
  "fixtures", "__fixtures__", "examples", "example", "samples", "demo", "e2e", "storybook-static"
]);
const MAX_DIRECTORY_DEPTH = 4;
/** Lower tiers win: explicit logos, then app icons, then favicons. */
const NAME_TIERS: readonly RegExp[] = [
  /(^|[-_.])(logo|logomark|brandmark)([-_.@]|$)/,
  /^(app[-_]?icon|icon)([-_.@]|$)/,
  /^(favicon|apple-touch-icon|android-chrome)([-_.@]|$)/
];
/** Variants that read badly in a small square avatar or on the app's own surfaces. */
const WEAK_VARIANT = /(^|[-_.])(wordmark|text|full|horizontal|banner|wide|dark|white|black|mono|outline)([-_.@]|$)/;

interface RankedLogo { path: string; score: readonly number[]; }

function rankLogoPath(path: string): RankedLogo | null {
  const segments = path.split("/");
  const fileName = segments.at(-1)?.toLowerCase() ?? "";
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) return null;
  const extensionRank = IMAGE_EXTENSIONS.indexOf(fileName.slice(dot + 1) as typeof IMAGE_EXTENSIONS[number]);
  if (extensionRank < 0) return null;
  const directories = segments.slice(0, -1).map((segment) => segment.toLowerCase());
  if (directories.length > MAX_DIRECTORY_DEPTH || directories.some((segment) => EXCLUDED_SEGMENTS.has(segment))) return null;
  const stem = fileName.slice(0, dot);
  const tier = NAME_TIERS.findIndex((pattern) => pattern.test(stem));
  if (tier < 0) return null;
  return { path, score: [tier, WEAK_VARIANT.test(stem) ? 1 : 0, directories.length, extensionRank, path.length] };
}

function compareScores(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < left.length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

export function pickWorkspaceLogoPaths(paths: readonly string[], limit = 3): string[] {
  return paths.map((path) => rankLogoPath(path.replace(/\\/g, "/")))
    .filter((entry): entry is RankedLogo => entry !== null)
    .sort((left, right) => compareScores(left.score, right.score) || left.path.localeCompare(right.path))
    .slice(0, limit)
    .map((entry) => entry.path);
}
