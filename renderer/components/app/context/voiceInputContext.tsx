import { createContext } from "react";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { VoiceInputPort } from "@/components/app/types/voiceInput.types";

/** Dictation's desktop calls; the app uses the system bridge, fixture hosts override it. */
export const VoiceInputContext = createContext<VoiceInputPort>(noraSystemClient);
