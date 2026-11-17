import { useCallback, useEffect, useState } from "react";
import { botMemoryClient } from "@/components/app/clients/botMemoryClient";
import type { MemoryReviewActivity } from "@shared/types/bots/memoryReview.types";
import type { MemoryReviewActivityState } from "@/components/app/types/modelPicker.types";

/** Recent background memory reviews and their token use, read when shown and on refresh. */
export function useMemoryReviewActivity(): MemoryReviewActivityState {
  const [activity, setActivity] = useState<MemoryReviewActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(() => {
    setLoading(true); setError(null);
    botMemoryClient.reviewActivity().then(setActivity, (cause: unknown) => setError(cause instanceof Error ? cause.message : "Memory review activity could not be read."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { activity, loading, error, refresh };
}
