import { useContext } from "react";
import { DemoModeContext } from "@/context/demoModeContext";

export function useDemoMode() {
  const mode = useContext(DemoModeContext);
  if (!mode) throw new Error("Demo mode requires DemoModeProvider.");
  return mode;
}
