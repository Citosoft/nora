import { REMOTE_CLIENT_HEADER, REMOTE_CLIENT_LABEL_MAX } from "@shared/remote-access/constants";

/** Letters, numbers, spaces and light punctuation only; the label is shown as plain text but never trusted. */
const SAFE_LABEL = /^[\p{L}\p{N} ·.,:()'’_+-]+$/u;

const BROWSERS: readonly { pattern: RegExp; name: string }[] = [
  { pattern: /EdgiOS|EdgA|Edg\//, name: "Edge" },
  { pattern: /CriOS|Chrome\//, name: "Chrome" },
  { pattern: /FxiOS|Firefox\//, name: "Firefox" },
  { pattern: /Safari\//, name: "Safari" }
];
const PLATFORMS: readonly { pattern: RegExp; name: string }[] = [
  { pattern: /iPad/, name: "iPad" },
  { pattern: /iPhone|iPod/, name: "iPhone" },
  { pattern: /Android/, name: "Android" },
  { pattern: /Macintosh|Mac OS X/, name: "Mac" },
  { pattern: /Windows/, name: "Windows" },
  { pattern: /CrOS/, name: "ChromeOS" },
  { pattern: /Linux/, name: "Linux" }
];

/** Names the device behind a request: the app's own label when it sends one, otherwise the browser and platform. */
export function describeRemoteClient(headers: Headers): string | null {
  const declared = headers.get(REMOTE_CLIENT_HEADER)?.trim();
  if (declared && declared.length <= REMOTE_CLIENT_LABEL_MAX && SAFE_LABEL.test(declared)) return declared;
  const agent = headers.get("User-Agent") ?? "";
  const platform = PLATFORMS.find((entry) => entry.pattern.test(agent))?.name;
  if (!platform) return null;
  const browser = BROWSERS.find((entry) => entry.pattern.test(agent))?.name;
  return browser ? `${browser} on ${platform}` : platform;
}
