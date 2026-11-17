import { openBrowserAsync } from "expo-web-browser";

/** Native: opens help and account pages in an in-app browser sheet. */
export async function openExternalUrl(url: string): Promise<void> {
  await openBrowserAsync(url);
}
