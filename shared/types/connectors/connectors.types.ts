import type { z } from "zod";
import type { connectorAccessSchema, connectorAuthInputSchema, connectorAuthSchema, connectorInputSchema, connectorSchema, connectorStatusSchema } from "@shared/connectors/contracts";

export type ConnectorAuthInput = z.infer<typeof connectorAuthInputSchema>;
export type ConnectorInput = z.infer<typeof connectorInputSchema>;
export type ConnectorAuth = z.infer<typeof connectorAuthSchema>;
export type ConnectorStatus = z.infer<typeof connectorStatusSchema>;
export type Connector = z.infer<typeof connectorSchema>;
export type ConnectorAccess = z.infer<typeof connectorAccessSchema>;
/** One dimension of a connector's access: everyone, or only the listed workspaces or bots. */
export type ConnectorAudience = ConnectorAccess["workspaces"];
/** The thread a connector would be handed to: its workspace, and its bot when it is a bot's thread. */
export interface ConnectorSubject { workspaceId: string; botId: string | null; }
