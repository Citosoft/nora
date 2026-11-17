import type { McpUiStyleVariableKey } from "@modelcontextprotocol/ext-apps/app-bridge";
import type { ToolActivity } from "@shared/types/conversation/contracts.types";
import type { McpAppCall } from "@shared/types/conversation/mcpApp.types";
import type { McpAppAction, McpAppPermissions, McpAppResult } from "@shared/types/provider/mcpApp.types";

export type McpAppToolArguments = Extract<McpAppAction, { kind: "call-tool" }>["arguments"];

/** A tool call whose server declared a widget, as its timeline entry shows it. */
export interface McpAppToolCall { tool: ToolActivity; app: McpAppCall; }
/** What a widget may ask of the thread it is shown in. */
export interface McpAppHost {
  open(itemId: string): Promise<McpAppResult>;
  callTool(itemId: string, tool: string, args: McpAppToolArguments): Promise<McpAppResult>;
  /** Puts a widget's message into the composer; widgets never send to the agent on their own. */
  draftMessage(text: string): void;
  openLink(url: string): void;
}
export interface McpAppEntryProps { call: McpAppToolCall; host: McpAppHost; }
/** A widget document ready to embed. */
export interface McpAppFrameSource {
  url: string;
  permissions: McpAppPermissions;
  prefersBorder: boolean;
  toolCalls: boolean;
}
export type McpAppLoadState =
  | { status: "loading" }
  | { status: "ready"; frame: McpAppFrameSource }
  | { status: "unavailable"; message: string };
export interface McpAppFrameProps {
  call: McpAppToolCall;
  frame: McpAppFrameSource;
  host: McpAppHost;
  title: string;
}
/** Host styling for widgets, read from the app's theme tokens. */
export interface McpAppTheme { theme: "light" | "dark"; variables: Partial<Record<McpUiStyleVariableKey, string>>; }
