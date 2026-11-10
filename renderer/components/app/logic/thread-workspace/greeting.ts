export function getGreetingFirstName(displayName: string): string {
  return displayName.trim().split(/\s+/u)[0] ?? "";
}
