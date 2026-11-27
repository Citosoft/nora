const IDENTIFIER = /^[\w.:@/[\]+-]{1,80}$/;

/**
 * Model and provider names are code-defined, but custom endpoints accept any string. Anything that does not look like an
 * identifier is reported as `custom` so a pasted URL or note never reaches analytics.
 */
export function toAnalyticsIdentifier(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return IDENTIFIER.test(trimmed) ? trimmed : "custom";
}
