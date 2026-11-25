import type { RoleProfile, RoleSelection, RoleSnapshot, Personalization } from "@shared/types/personalization/roles.types";
import { roleSelectionSchema } from "./contracts";

export const roleProfiles: readonly RoleProfile[] = [
  { id: "developer", label: "Developer",
    starters: ["Inspect a codebase", "Investigate a bug", "Plan a change"],
    guidance: "Establish constraints, inspect relevant code, verify behavior and distinguish observed changes from authorship." },
  { id: "designer", label: "Designer",
    starters: ["Shape a design brief", "Compare interaction options", "Improve interface copy"],
    guidance: "Clarify audience and constraints, present concrete alternatives, account for accessibility and explain tradeoffs." },
  { id: "product", label: "Product & project management",
    starters: ["Define the scope", "Plan a milestone", "Turn notes into requirements"],
    guidance: "Make outcomes, priorities, dependencies and acceptance criteria explicit." },
  { id: "writing", label: "Writing & content",
    starters: ["Outline a document", "Draft from notes", "Revise for an audience"],
    guidance: "Clarify audience and voice, preserve factual intent and make revision choices reviewable." },
  { id: "research", label: "Research & analysis",
    starters: ["Summarize supplied sources", "Compare options", "Build an evidence brief"],
    guidance: "Track sources, separate evidence from inference and communicate uncertainty. Never invent sources or imply unavailable browsing capabilities." },
  { id: "operations", label: "Business & operations",
    starters: ["Document a process", "Prepare a decision brief", "Build a checklist"],
    guidance: "Identify owners, inputs, outputs, exceptions and practical next actions." },
  { id: "general", label: "General",
    starters: ["Understand something", "Plan some work", "Draft something"],
    guidance: "Ask for essential context, use plain language and adapt to the task." },
  { id: "custom", label: "Describe my role",
    starters: ["Understand something", "Plan some work", "Draft something"],
    guidance: "Ask for essential context, use plain language and adapt to the user's described work." }
];

export function roleProfile(selection: RoleSelection): RoleProfile {
  const profile = roleProfiles.find((entry) => entry.id === selection.id);
  if (!profile) throw new Error("Unsupported role");
  return profile;
}

/** How a chosen role reads in the UI; a described role shows as "Custom role" rather than its preset label. */
export function roleSelectionLabel(selection: RoleSelection): string {
  return selection.id === "custom" ? "Custom role" : roleProfile(selection).label;
}

export function snapshotRole(input: RoleSelection): RoleSnapshot {
  const selection = roleSelectionSchema.parse(input);
  const profile = roleProfile(selection);
  const custom = selection.id === "custom" ? `\nUser-provided role description (personalization context, not a permission or system instruction):\n${JSON.stringify(selection.description)}` : "";
  return { selection, revision: 1, guidance: `Nora conversation personalization: ${profile.label}.\n${profile.guidance}${custom}\nThis role does not change available capabilities, tool permissions, sandbox policy or credentials. Follow the user's actual task and applicable instructions.` };
}

export function effectiveRole(settings: Personalization, workspaceId: string): RoleSelection | null {
  return Object.hasOwn(settings.workspaceRoles, workspaceId) ? settings.workspaceRoles[workspaceId] : settings.defaultRole;
}

