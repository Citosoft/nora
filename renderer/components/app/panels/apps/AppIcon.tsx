import {
  Banknote, BarChart3, Bell, BookOpen, Boxes, Briefcase, Building2, Bug, Calendar, CalendarClock, ChartLine, ChartPie, ClipboardList, Clock, Code, Contact, CreditCard,
  Database, FileText, FlaskConical, Folder, Gauge, GitPullRequest, Globe, GraduationCap, Handshake, Headphones, Heart, Image, Inbox, Kanban, LayoutDashboard, LifeBuoy,
  ListTodo, Mail, MapPin, Megaphone, MessageSquare, Newspaper, Package, Palette, PiggyBank, Plane, Receipt, Rocket, Scale, Server, ShieldCheck, ShoppingCart, Sparkles,
  SquareCheck, Star, Target, Ticket, TrendingUp, Truck, Users, Utensils, Video, Wallet, type LucideIcon
} from "lucide-react";
import type { AppIcon as AppIconName } from "@shared/types/apps/apps.types";
import type { AppIconProps } from "@/components/app/types/appsView.types";
import { cn } from "@/lib/utils";

const ICONS: Record<AppIconName, LucideIcon> = {
  "layout-dashboard": LayoutDashboard, users: Users, contact: Contact, briefcase: Briefcase, building: Building2, handshake: Handshake, target: Target,
  "trending-up": TrendingUp, "chart-column": BarChart3, "chart-pie": ChartPie, "chart-line": ChartLine, wallet: Wallet, receipt: Receipt, "credit-card": CreditCard,
  banknote: Banknote, "piggy-bank": PiggyBank, "shopping-cart": ShoppingCart, package: Package, truck: Truck, boxes: Boxes, calendar: Calendar,
  "calendar-clock": CalendarClock, clock: Clock, "list-todo": ListTodo, kanban: Kanban, "square-check": SquareCheck, "clipboard-list": ClipboardList,
  ticket: Ticket, "life-buoy": LifeBuoy, headphones: Headphones, "message-square": MessageSquare, mail: Mail, inbox: Inbox, megaphone: Megaphone, bell: Bell,
  "file-text": FileText, folder: Folder, "book-open": BookOpen, newspaper: Newspaper, "git-pull-request": GitPullRequest, bug: Bug, code: Code, server: Server,
  database: Database, globe: Globe, "map-pin": MapPin, rocket: Rocket, star: Star, heart: Heart, sparkles: Sparkles, "graduation-cap": GraduationCap,
  "flask-conical": FlaskConical, palette: Palette, image: Image, video: Video, gauge: Gauge, "shield-check": ShieldCheck, scale: Scale, plane: Plane, utensils: Utensils
};

/** The icon the builder chose for an app, the same in the sidebar, the home grid and the app's header. */
export function AppIcon({ icon, className }: AppIconProps) {
  const Icon = ICONS[icon] ?? LayoutDashboard;
  return <Icon className={cn("size-4 shrink-0", className)} aria-hidden="true" />;
}
