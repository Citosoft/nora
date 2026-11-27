import { useCallback, useEffect, useRef, useState } from "react";
import { islandClient } from "@/components/app/clients/islandClient";
import { islandDemoNotice } from "@/components/app/logic/island/islandDemoNotice";
import type { IslandDemoNotice } from "@/components/app/types/island.types";
import type { IslandDemoScenario } from "@shared/types/island/island.types";

/**
 * Starts island previews from a settings section, explains when one cannot show, and ends a preview this section
 * started once the section goes away (Settings closing, or another section opening).
 */
export function useIslandPreview() {
  const [notice, setNotice] = useState<IslandDemoNotice | null>(null);
  const started = useRef(false);

  const preview = useCallback((scenario: IslandDemoScenario) => {
    setNotice(null);
    void islandClient.demo(scenario).then((result) => {
      if (result === "shown") started.current = true;
      setNotice(islandDemoNotice(result));
    }).catch((error: unknown) => setNotice({ title: "Could not preview the island", description: error instanceof Error ? error.message : "Nora did not answer." }));
  }, []);

  useEffect(() => () => {
    if (!started.current) return;
    started.current = false;
    islandClient.stopDemo().catch((error: unknown) => console.error("The notch island preview could not be ended", error));
  }, []);

  return { preview, notice };
}
