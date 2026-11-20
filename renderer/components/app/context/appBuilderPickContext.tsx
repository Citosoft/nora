import { createContext, useContext } from "react";
import type { AppBuilderPickHandler } from "@/components/app/types/appsBuilder.types";

/** Present only while an app is shown beside its builder: cards become pickable so a change request can point at one. */
export const AppBuilderPickContext = createContext<AppBuilderPickHandler | null>(null);
export const useAppBuilderPick = (): AppBuilderPickHandler | null => useContext(AppBuilderPickContext);
