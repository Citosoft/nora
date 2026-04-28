export function createSpecDraft(title: string): string {
  return [
    `# ${title}`,
    "",
    "## Overview",
    "",
    "- Describe the problem, feature, or initiative.",
    "",
    "## Requirements",
    "",
    "- Capture functional and technical expectations.",
    "",
    "## Notes",
    "",
    "- Add references, constraints, and open questions."
  ].join("\n");
}
