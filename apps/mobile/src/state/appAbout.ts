import type { AppAboutInfo, AppInfoSection, NativeAppAbout } from "@/types/appAbout.types";

const display = (value: string | null): string => value || "Not available";
const date = (value: Date | null): string => value && Number.isFinite(value.getTime()) ? value.toLocaleString() : "Not available";

export function appVersionLabel(info: AppAboutInfo): string {
  const version = info.version ? `Version ${info.version}` : "Version not available";
  return info.kind === "native" && info.build ? `${version} (${info.build})` : version;
}

export function describeUpdateStatus(info: NativeAppAbout): string {
  if (!info.updatesEnabled) return info.source === "development" ? "Disabled in development" : "Updates disabled";
  if (info.pending) return "Downloaded — restart to apply";
  if (info.downloading) return "Downloading update…";
  if (info.checking) return "Checking for updates…";
  if (info.checkFailed) return "Couldn’t check — try again";
  if (info.downloadFailed) return "Download failed — try again";
  if (info.available) return "Update available";
  return info.lastCheckedAt ? "Up to date" : "Not checked this session";
}

export function appAboutSections(info: AppAboutInfo): AppInfoSection[] {
  if (info.kind === "web") return [{ title: "About Nora", rows: [{ label: "App version", value: display(info.version) },
    { label: "App type", value: "Web app" }], footer: "This web app updates separately from the iPhone app. Native OTA details appear in the installed app." }];
  const sources: Record<NativeAppAbout["source"], string> = { development: "Development build", embedded: "Bundled with app", ota: "Downloaded OTA update", recovery: "Bundled recovery version" };
  const sections: AppInfoSection[] = [
    { title: "Installed app", rows: [{ label: "App version", value: display(info.version) }, { label: "Build number", value: display(info.build) },
      { label: "Bundle ID", value: display(info.applicationId) }], footer: "The app version and build number identify your TestFlight install. They stay the same when an OTA update is applied." },
    { title: "Running update", rows: [{ label: "Running from", value: sources[info.source] }, { label: "Update ID", value: display(info.updateId) },
      { label: "Published", value: date(info.publishedAt) }, { label: "Channel", value: display(info.channel) }, { label: "Runtime version", value: display(info.runtimeVersion) }],
      footer: info.source === "recovery" ? "Nora fell back to its bundled version because an update could not start."
        : "The Update ID identifies the code running right now. A downloaded update gets a different ID when you restart into it. Long-press a value to select and copy it." },
    { title: "Update checks", rows: [{ label: "OTA updates", value: info.updatesEnabled ? "Enabled" : "Disabled" },
      { label: "Status", value: describeUpdateStatus(info) }, { label: "Last checked", value: date(info.lastCheckedAt) }],
      footer: "Update checks shown here are from this app session." }
  ];
  if (info.nextUpdateId) sections.push({ title: info.pending ? "Downloaded update" : "Available update", rows: [{ label: "Update ID", value: info.nextUpdateId }],
    footer: "This update is not running yet. Apply it and check the Running update ID again after Nora restarts." });
  return sections;
}
