import type {
  ProjectScaffoldFavorite,
  SaveProjectScaffoldFavoriteInput
} from "@/components/app/types/projectScaffoldWizard.types";

const PROJECT_SCAFFOLD_FAVORITES_STORAGE_KEY = "nora-project-scaffold-favorites-v1";

function isStringArray(value: object, key: string): boolean {
  const candidate = Reflect.get(value, key);
  return Array.isArray(candidate) && candidate.every((entry) => typeof entry === "string");
}

function normalizeStoredFavorite(value: object): ProjectScaffoldFavorite | null {
  const id = Reflect.get(value, "id");
  const name = Reflect.get(value, "name");
  const frameworkId = Reflect.get(value, "frameworkId");
  const toolId = Reflect.get(value, "toolId");
  const createdAt = Reflect.get(value, "createdAt");
  const updatedAt = Reflect.get(value, "updatedAt");

  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    typeof frameworkId !== "string" ||
    (toolId !== null && typeof toolId !== "string") ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string" ||
    !isStringArray(value, "componentIds") ||
    !isStringArray(value, "testingIds")
  ) {
    return null;
  }

  return {
    id,
    name,
    frameworkId,
    componentIds: Reflect.get(value, "componentIds") as string[],
    testingIds: Reflect.get(value, "testingIds") as string[],
    toolId,
    createdAt,
    updatedAt
  };
}

export function readStoredProjectScaffoldFavorites(): ProjectScaffoldFavorite[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(PROJECT_SCAFFOLD_FAVORITES_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is object => typeof entry === "object" && entry !== null)
      .map(normalizeStoredFavorite)
      .filter((entry): entry is ProjectScaffoldFavorite => entry !== null);
  } catch {
    return [];
  }
}

function writeStoredProjectScaffoldFavorites(favorites: ProjectScaffoldFavorite[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(PROJECT_SCAFFOLD_FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // Favorites are optional UI state; storage failures must not block project creation.
  }
}

export function saveProjectScaffoldFavorite(
  favorites: ProjectScaffoldFavorite[],
  input: SaveProjectScaffoldFavoriteInput,
  now: string,
  createId: () => string
): ProjectScaffoldFavorite[] {
  const normalizedName = input.name.trim();
  const existing = favorites.find((favorite) => favorite.name.toLowerCase() === normalizedName.toLowerCase());
  const nextFavorite: ProjectScaffoldFavorite = {
    id: existing?.id ?? createId(),
    name: normalizedName,
    frameworkId: input.frameworkId,
    componentIds: [...input.componentIds],
    testingIds: [...input.testingIds],
    toolId: input.toolId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
  const nextFavorites = [nextFavorite, ...favorites.filter((favorite) => favorite.id !== nextFavorite.id)];
  writeStoredProjectScaffoldFavorites(nextFavorites);
  return nextFavorites;
}

export function deleteProjectScaffoldFavorite(
  favorites: ProjectScaffoldFavorite[],
  favoriteId: string
): ProjectScaffoldFavorite[] {
  const nextFavorites = favorites.filter((favorite) => favorite.id !== favoriteId);
  writeStoredProjectScaffoldFavorites(nextFavorites);
  return nextFavorites;
}
