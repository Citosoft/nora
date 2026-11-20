import type { ThirdPartyNoticesState } from "@/components/app/types/aboutDialog.types";
import { useCallback, useState } from "react";

/** Lazily loads the bundled third-party notices the first time they are shown. */
export function useThirdPartyNotices(): ThirdPartyNoticesState {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const show = useCallback((): void => {
    setOpen(true);
    if (content || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);
    void fetch("./THIRD_PARTY_NOTICES.md").then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load notices (HTTP ${response.status})`);
      }
      setContent(await response.text());
    }).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load third-party notices.");
    }).finally(() => {
      setIsLoading(false);
    });
  }, [content, isLoading]);

  return { open, setOpen, show, content, isLoading, error };
}
