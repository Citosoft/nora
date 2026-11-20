/** Public directory links carry a catalog id, never an arbitrary download URL. */
export const APP_INSTALL_SCHEME = "nora";
export const APP_DIRECTORY_URL = "https://www.withnora.run/apps";
export const isDirectoryAppId = (value: string): boolean => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 100;

export function parseAppInstallLink(value: string): string | null {
  try {
    const url = new URL(value);
    const id = url.searchParams.get("id");
    return url.protocol === `${APP_INSTALL_SCHEME}:` && url.host === "apps" && url.pathname === "/install"
      && !url.username && !url.password && !url.hash && [...url.searchParams.keys()].length === 1 && id && isDirectoryAppId(id) ? id : null;
  } catch { return null; }
}
export const directoryAppUrl = (id: string): string => {
  if (!isDirectoryAppId(id)) throw new Error("This directory app id is not valid.");
  return `${APP_DIRECTORY_URL}/files/${id}.nora-app.json`;
};
