import type { z } from "zod";
import type { connectorAuthPromptAnswerSchema, connectorAuthPromptSchema } from "@shared/connectors/authPrompt";

export type ConnectorAuthPrompt = z.infer<typeof connectorAuthPromptSchema>;
export type ConnectorAuthPromptAnswer = z.infer<typeof connectorAuthPromptAnswerSchema>;
