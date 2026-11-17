/** Expo Router params can be repeated (`string[]`); screens use the first value. */
export function singleParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}
