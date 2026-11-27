/** What each analytics level sends. Shown in the consent prompt and Settings → Privacy so both always say the same thing. */
export const ANALYTICS_DISCLOSURE = {
  statistics: [
    "A random installation ID, so we can count unique installs. It is not linked to your account.",
    "App version, operating system, processor type, language and the country from your region setting.",
    "Which features you use and how often, and which providers, models and reasoning levels your threads run on.",
    "How turns end (completed, failed, stopped), how long they take and how many tokens they use.",
    "Error types and codes, and counts of what you have set up, such as bots, workspaces and connectors."
  ],
  detailed: [
    "The screens, tools and Settings sections you open, and the shortcuts and menu commands you use.",
    "Error messages and stack traces, with file paths, web addresses, email addresses and keys removed first."
  ],
  never: "Never collected: your name, email, account, IP address, prompts, messages, code, file contents, file or project names, or keys.",
  storage: "Stored in the EU by PostHog (Frankfurt) for up to 13 months. Full details are at withnora.run/privacy."
} as const;
