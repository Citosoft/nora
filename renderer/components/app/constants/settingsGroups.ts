import type { SettingsGroupItem } from "@/components/app/types/settingsSearch.types";
import {
  BarChart3,
  Bot,
  Cpu,
  FlaskConical,
  Globe,
  LayoutDashboard,
  Mic2,
  Palette,
  Plug,
  Shield,
  SlidersHorizontal,
  Sparkles,
  TerminalSquare
} from "lucide-react";

export const SETTINGS_GROUP_ITEMS: readonly SettingsGroupItem[] = [
  { value: "appearance", label: "Appearance", icon: Palette },
  { value: "general", label: "General", icon: SlidersHorizontal },
  { value: "workbench", label: "Workbench", icon: LayoutDashboard },
  { value: "terminal", label: "Terminal", icon: TerminalSquare },
  { value: "browser", label: "Browser", icon: Globe },
  { value: "cli", label: "Agents", icon: Bot },
  { value: "agentUsage", label: "Agent usage", icon: BarChart3 },
  { value: "skills", label: "Skills", icon: Sparkles },
  { value: "integrations", label: "Integrations", icon: Plug },
  { value: "ai", label: "AI", icon: Bot },
  { value: "voice", label: "Voice", icon: Mic2 },
  { value: "privacy", label: "Privacy", icon: Shield },
  { value: "system", label: "System", icon: Cpu },
  ...(!__NORA_IS_PRODUCTION__ ? [{ value: "dev" as const, label: "Dev", icon: FlaskConical }] : [])
];
