import { z } from "zod";

/**
 * The icons an app can wear, named in kebab-case so the agent can pick one by meaning. Kept to a curated set: every name is
 * described to the model on each builder turn, and the window maps each to a lucide icon.
 */
export const APP_ICON_NAMES = [
  "layout-dashboard", "users", "contact", "briefcase", "building", "handshake", "target", "trending-up", "chart-column", "chart-pie", "chart-line",
  "wallet", "receipt", "credit-card", "banknote", "piggy-bank", "shopping-cart", "package", "truck", "boxes", "calendar", "calendar-clock", "clock",
  "list-todo", "kanban", "square-check", "clipboard-list", "ticket", "life-buoy", "headphones", "message-square", "mail", "inbox", "megaphone", "bell",
  "file-text", "folder", "book-open", "newspaper", "git-pull-request", "bug", "code", "server", "database", "globe", "map-pin", "rocket", "star",
  "heart", "sparkles", "graduation-cap", "flask-conical", "palette", "image", "video", "gauge", "shield-check", "scale", "plane", "utensils"
] as const;
export const DEFAULT_APP_ICON = "layout-dashboard";
export const appIconSchema = z.enum(APP_ICON_NAMES);
