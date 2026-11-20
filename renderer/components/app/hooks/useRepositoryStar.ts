import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { RepositoryStarState, RepositoryStarStatus } from "@/components/app/types/aboutDialog.types";
import { APP_GITHUB_REPOSITORY_API_URL, APP_REPOSITORY_URL } from "@shared/appMeta";
import { useCallback, useEffect, useState } from "react";

async function fetchRepositoryStarCount(): Promise<number | null> {
  try {
    const response = await fetch(APP_GITHUB_REPOSITORY_API_URL, {
      headers: { Accept: "application/vnd.github+json" }
    });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null || !("stargazers_count" in payload)) {
      return null;
    }
    return typeof payload.stargazers_count === "number" ? payload.stargazers_count : null;
  } catch {
    return null;
  }
}

/** Loads the app repository's star count and the user's star state (via `gh`) while `open` is true. */
export function useRepositoryStar(open: boolean): RepositoryStarState {
  const [starCount, setStarCount] = useState<number | null>(null);
  const [status, setStatus] = useState<RepositoryStarStatus>("loading");
  const [isStarring, setIsStarring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let mounted = true;
    setStarCount(null);
    setStatus("loading");
    setError(null);
    setIsStarring(false);

    void Promise.all([
      fetchRepositoryStarCount(),
      noraSystemClient.checkAppRepositoryStarred().catch(() => null)
    ]).then(([count, starred]) => {
      if (!mounted) {
        return;
      }
      setStarCount(count);
      setStatus(starred === true ? "starred" : starred === false ? "unstarred" : "unavailable");
    });

    return () => {
      mounted = false;
    };
  }, [open]);

  const openRepository = useCallback((): void => {
    void noraSystemClient.openExternalUrl(APP_REPOSITORY_URL);
  }, []);

  const star = useCallback((): void => {
    if (status === "starred" || status === "loading" || isStarring) {
      return;
    }
    if (status === "unavailable") {
      openRepository();
      return;
    }

    setIsStarring(true);
    setError(null);
    void noraSystemClient.starAppRepository().then((starred) => {
      setIsStarring(false);
      if (starred) {
        setStatus("starred");
        setStarCount((current) => (current === null ? current : current + 1));
        return;
      }
      setError("Could not star the repo. Make sure gh is authenticated and try again.");
    });
  }, [isStarring, openRepository, status]);

  return { status, starCount, isStarring, error, star, openRepository };
}
