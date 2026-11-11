import type { WorkspaceAvatarColor, WorkspaceAvatarColorOption } from "@/components/app/types/workspaceAvatar.types";

export const workspaceAvatarColors = [
  { id: "blue", label: "Blue", className: "bg-blue-800" },
  { id: "violet", label: "Violet", className: "bg-violet-800" },
  { id: "fuchsia", label: "Fuchsia", className: "bg-fuchsia-800" },
  { id: "rose", label: "Rose", className: "bg-rose-800" },
  { id: "orange", label: "Orange", className: "bg-orange-800" },
  { id: "teal", label: "Teal", className: "bg-teal-800" },
  { id: "emerald", label: "Emerald", className: "bg-emerald-800" },
  { id: "cyan", label: "Cyan", className: "bg-cyan-800" }
] as const satisfies readonly WorkspaceAvatarColorOption[];

export function workspaceInitials(name: string): string {
  const words = name.normalize("NFKC").match(/[\p{L}\p{N}]+/gu) ?? [];
  const first = words[0];
  if (!first) return "WS";
  const letters = words.length > 1
    ? `${Array.from(first)[0]}${Array.from(words.at(-1) ?? first)[0]}`
    : first;
  const initials = Array.from(letters.toLocaleUpperCase()).slice(0, 2);
  return initials.length === 1 ? `${initials[0]}${initials[0]}` : initials.join("");
}

/** Use identity rather than list position or name so sorting and renaming keep the same color. */
export function workspaceAvatarColor(id: string, selectedColor?: WorkspaceAvatarColor): string {
  const selected = workspaceAvatarColors.find((color) => color.id === selectedColor);
  if (selected) return selected.className;
  let hash = 0;
  for (const character of id) hash = (Math.imul(hash, 31) + (character.codePointAt(0) ?? 0)) >>> 0;
  return workspaceAvatarColors[hash % workspaceAvatarColors.length].className;
}
