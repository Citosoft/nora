import { useCallback, useEffect, useState } from "react";
import type { ToolImageLoadState, OutputHost } from "@/components/app/types/toolImage.types";

const UNAVAILABLE = "This image is no longer available on the machine that made it.";

/** Loads a bounded preview of one of a tool's output images. */
export function useToolImage(host: OutputHost, itemId: string, path: string): { state: ToolImageLoadState; retry: () => void } {
  const [state, setState] = useState<ToolImageLoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setState({ status: "loading" });
    host.read(itemId, path, "preview").then((file) => {
      if (current) setState(file?.kind === "image" ? { status: "ready", preview: file.preview } : { status: "unavailable", message: UNAVAILABLE });
    }, (error: unknown) => {
      if (current) setState({ status: "unavailable", message: error instanceof Error ? error.message : UNAVAILABLE });
    });
    return () => { current = false; };
  }, [host, itemId, path, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { state, retry };
}
