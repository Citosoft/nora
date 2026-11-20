import { parseAppInstallLink } from "@shared/apps/installLink";

/** Retains the most recent link across startup, sign-in and renderer reloads until the user closes its review. */
export function createAppInstallRequests(notify: (id: string) => void) {
  let pending: string | null = null;
  return {
    get: (): string | null => pending,
    clear(id: string): void { if (pending === id) pending = null; },
    enqueue(value: string): boolean {
      const id = parseAppInstallLink(value);
      if (!id) return false;
      pending = id;
      notify(id);
      return true;
    }
  };
}
