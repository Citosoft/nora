import {
  readDiffAnnotationIntroSeen,
  writeDiffAnnotationIntroSeen
} from "@/components/app/logic/diffAnnotationIntroPersistence";
import { useCallback, useEffect, useState } from "react";

export function useDiffAnnotationIntroDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (readDiffAnnotationIntroSeen()) {
      return;
    }

    writeDiffAnnotationIntroSeen();
    setOpen(true);
  }, []);

  const onOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
  }, []);

  return { open, onOpenChange };
}
