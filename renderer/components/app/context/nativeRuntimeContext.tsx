import { createContext } from "react";
import type { NativeRuntimePorts } from "@/components/app/types/thread-workspace/runtime.types";

export const NativeRuntimeContext = createContext<NativeRuntimePorts | null>(null);
