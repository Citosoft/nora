/** Formats a signed count of a unit, e.g. (-5, "minute") → "5 minutes ago". */
export type FormatRelative = (value: number, unit: Intl.RelativeTimeFormatUnit) => string;
