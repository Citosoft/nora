import { createContext } from "react";
import type { FavoriteModelsPort } from "@/components/app/types/modelPicker.types";

/** Favourite models for every model picker in the window; supplied by the native runtime, or by a fixture host. */
export const FavoriteModelsContext = createContext<FavoriteModelsPort | null>(null);
