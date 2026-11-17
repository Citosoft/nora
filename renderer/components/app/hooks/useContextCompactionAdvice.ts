import { useEffect, useState } from "react";
import { cacheCompactionAdvice, IDLE_COMPACTION_MIN_TOKENS } from "@shared/conversations/compaction";
import type { ContextUsage } from "@shared/types/conversation/contracts.types";

/** Wake only at a known expiry or when returning to the app; unknown timing never creates a polling timer. */
export function useContextCompactionAdvice(context: ContextUsage | null | undefined, enabled: boolean) {
  const [now, setNow] = useState(Date.now);
  const expiry = context?.promptCacheExpiresAt;
  const large = (context?.usedTokens ?? 0) >= IDLE_COMPACTION_MIN_TOKENS;
  useEffect(() => {
    if (!enabled || !large || !expiry) return;
    const expiresAt = Date.parse(expiry);
    if (!Number.isFinite(expiresAt)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = (): void => {
      clearTimeout(timer);
      const timestamp = Date.now(); setNow(timestamp);
      if (expiresAt > timestamp) timer = setTimeout(update, Math.min(expiresAt - timestamp, 2_147_483_647));
    };
    update();
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => { clearTimeout(timer); window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); };
  }, [enabled, large, expiry]);
  return enabled ? cacheCompactionAdvice(context, now) : "none";
}
