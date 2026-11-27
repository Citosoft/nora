import type { SettingsCategory } from "@/components/app/types/settingsSearch.types";
import {
  ArrowRightLeft,
  BarChart3,
  Bot,
  Cpu,
  FlaskConical,
  Globe,
  Keyboard,
  LayoutDashboard,
  Mic2,
  MessagesSquare,
  Palette,
  PanelTop,
  Plug,
  ScrollText,
  Smartphone,
  Server,
  Shield,
  SlidersHorizontal,
  TerminalSquare,
  Vault
} from "lucide-react";
import { detectKeybindingPlatform } from "@/components/app/logic/keybindings/keybindingSet";

/** The notch island exists only on macOS, so its settings appear only there. */
const isMac = detectKeybindingPlatform() === "darwin";

export const SETTINGS_CATEGORIES: readonly SettingsCategory[] = [
  {
    label: "App",
    items: [
      { value: "general", label: "General", icon: SlidersHorizontal },
      { value: "appearance", label: "Appearance", icon: Palette },
      { value: "workbench", label: "Workbench", icon: LayoutDashboard },
      { value: "terminal", label: "Terminal", icon: TerminalSquare },
      { value: "keybindings", label: "Keybindings", icon: Keyboard },
      { value: "browser", label: "Browser", icon: Globe },
      ...(isMac ? [{ value: "notchIsland" as const, label: "Notch island", icon: PanelTop }] : [])
    ]
  },
  {
    label: "Agents & AI",
    items: [
      { value: "cli", label: "Providers", icon: Bot },
      { value: "threads", label: "Threads", icon: MessagesSquare },
      { value: "bots", label: "Bots", icon: Bot },
      { value: "ai", label: "AI", icon: Bot },
      { value: "voice", label: "Voice", icon: Mic2 },
      { value: "agentUsage", label: "Agent usage", icon: BarChart3 }
    ]
  },
  {
    label: "Connections & tools",
    items: [
      { value: "connections", label: "Connections", icon: Server },
      { value: "integrations", label: "Integrations", icon: Plug },
      { value: "mcp", label: "MCP Servers", icon: Server },
      { value: "skills", label: "Skills", icon: ScrollText },
      { value: "vault", label: "Vault", icon: Vault },
      { value: "remoteAccess", label: "Nora Relay", icon: Smartphone }
    ]
  },
  {
    label: "Advanced",
    items: [
      { value: "privacy", label: "Privacy", icon: Shield },
      { value: "system", label: "System", icon: Cpu },
      { value: "migrate", label: "Migrate", icon: ArrowRightLeft },
      ...(!__NORA_IS_PRODUCTION__ ? [{ value: "dev" as const, label: "Dev", icon: FlaskConical }] : [])
    ]
  }
];

export const SETTINGS_GROUP_ITEMS = SETTINGS_CATEGORIES.flatMap((category) => category.items);
