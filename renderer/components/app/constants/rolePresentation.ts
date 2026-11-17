import { Braces, BriefcaseBusiness, Compass, ListTodo, PenLine, Search, Shapes, WandSparkles } from "lucide-react";
import type { RoleId } from "@shared/types/personalization/roles.types";
import type { RolePresentation } from "@/components/app/types/personalization.types";

export const rolePresentation: Record<RoleId, RolePresentation> = {
  developer: { icon: Braces, shortLabel: "Engineering", description: "Build, debug, and ship ideas" },
  designer: { icon: Shapes, shortLabel: "Design", description: "Craft thoughtful experiences" },
  product: { icon: ListTodo, shortLabel: "Product", description: "Turn big plans into progress" },
  writing: { icon: PenLine, shortLabel: "Writing", description: "Find the words that connect" },
  research: { icon: Search, shortLabel: "Research", description: "Explore ideas and find insights" },
  operations: { icon: BriefcaseBusiness, shortLabel: "Operations", description: "Keep things running smoothly" },
  general: { icon: Compass, shortLabel: "General", description: "A little bit of everything" },
  custom: { icon: WandSparkles, shortLabel: "Something else", description: "Make space for your kind of work" }
};
