import { createContext } from "react";
import type { AppPanelLayoutState } from "@/components/app/types/appPanelLayout.types";

export const AppPanelLayoutContext = createContext<AppPanelLayoutState | null>(null);
