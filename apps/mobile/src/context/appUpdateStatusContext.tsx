import { createContext } from "react";
import type { AppUpdateStatus } from "@/types/appAbout.types";

export const AppUpdateStatusContext = createContext<AppUpdateStatus | null>(null);
