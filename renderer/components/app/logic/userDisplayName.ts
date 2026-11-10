const STORAGE_KEY = "nora-user-display-name";
const CHANGED_EVENT = "nora:user-display-name-changed";

export function readUserDisplayName(): string {
  return window.localStorage.getItem(STORAGE_KEY)?.trim() ?? "";
}

export function writeUserDisplayName(value: string): void {
  const name = value.trim();
  if (name === readUserDisplayName()) return;
  if (name) window.localStorage.setItem(STORAGE_KEY, name);
  else window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

export function subscribeUserDisplayName(listener: () => void): () => void {
  const onStorage = (event: StorageEvent): void => {
    if (event.storageArea === window.localStorage && (event.key === STORAGE_KEY || event.key === null)) listener();
  };
  window.addEventListener(CHANGED_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGED_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
