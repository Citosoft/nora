import type { LinuxAptSetupStatus } from "@shared/appTypes";
import { app } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const APT_REPO_URL = "https://apt.citosoft.co.uk";
const APT_SOURCE_ENTRY = `deb [signed-by=/usr/share/keyrings/citosoft-archive-keyring.gpg] ${APT_REPO_URL} stable main`;
const APT_KEYRING_PATH = "/usr/share/keyrings/citosoft-archive-keyring.gpg";
const APT_SOURCE_LIST_PATH = "/etc/apt/sources.list.d/citosoft.list";
const APT_KEY_DOWNLOAD_URL = `${APT_REPO_URL}/keys/citosoft-archive-keyring.gpg`;

function getManualCommands(): string[] {
  return [
    `curl -fsSL ${APT_KEY_DOWNLOAD_URL} | sudo tee ${APT_KEYRING_PATH} >/dev/null`,
    `echo "${APT_SOURCE_ENTRY}" | sudo tee ${APT_SOURCE_LIST_PATH} >/dev/null`,
    "sudo apt update"
  ];
}

function getBaseStatusFields() {
  return {
    repoUrl: APT_REPO_URL,
    sourceEntry: APT_SOURCE_ENTRY,
    keyringPath: APT_KEYRING_PATH,
    sourceListPath: APT_SOURCE_LIST_PATH,
    manualCommands: getManualCommands()
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getSourceFiles(): Promise<string[]> {
  const candidates = ["/etc/apt/sources.list"];

  try {
    const entries = await fs.readdir("/etc/apt/sources.list.d", { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".list")) {
        candidates.push(path.join("/etc/apt/sources.list.d", entry.name));
      }
    }
  } catch {
    return candidates;
  }

  return candidates;
}

async function hasSourceEntry(): Promise<boolean> {
  const files = await getSourceFiles();
  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, "utf8");
      if (content.includes(APT_REPO_URL)) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

async function checkPkexecAvailable(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const child = spawn("pkexec", ["--version"]);
    child.once("error", () => resolve(false));
    child.once("exit", (code) => resolve(code === 0));
  });
}

function runPrivilegedSetupScript(scriptPath: string, keyPath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("pkexec", ["/bin/sh", scriptPath, keyPath], {
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stderr = "";
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.once("error", (error) => {
      reject(error);
    });

    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      const message = stderr.trim() || "The privileged APT setup command failed.";
      reject(new Error(message));
    });
  });
}

export async function getLinuxAptSetupStatus(): Promise<LinuxAptSetupStatus> {
  const base = getBaseStatusFields();

  if (process.platform !== "linux") {
    return {
      kind: "unsupported",
      reason: "APT repository setup is only available on Linux.",
      ...base
    };
  }

  if (!app.isPackaged) {
    return {
      kind: "unsupported",
      reason: "APT repository setup is only relevant for packaged Linux builds.",
      ...base
    };
  }

  const [keyringExists, sourceEntryExists, pkexecAvailable] = await Promise.all([
    fileExists(APT_KEYRING_PATH),
    hasSourceEntry(),
    checkPkexecAvailable()
  ]);

  if (keyringExists && sourceEntryExists) {
    return {
      kind: "configured",
      ...base
    };
  }

  return {
    kind: "missing",
    pkexecAvailable,
    ...base
  };
}

export async function installLinuxAptUpdates(): Promise<LinuxAptSetupStatus> {
  const status = await getLinuxAptSetupStatus();
  if (status.kind !== "missing") {
    return status;
  }

  if (!status.pkexecAvailable) {
    throw new Error("`pkexec` is not available. Use the manual setup commands instead.");
  }

  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "nora-apt-"));
  const keyPath = path.join(tempDirectory, "citosoft-archive-keyring.gpg");
  const scriptPath = path.join(tempDirectory, "install-apt-source.sh");

  try {
    const response = await fetch(APT_KEY_DOWNLOAD_URL, {
      headers: {
        Accept: "application/octet-stream"
      },
      signal: AbortSignal.timeout(10_000)
    });

    if (!response.ok) {
      throw new Error(`Unable to download the APT signing key (${response.status}).`);
    }

    const keyBuffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(keyPath, keyBuffer);
    await fs.writeFile(
      scriptPath,
      `#!/bin/sh
set -eu
install -D -m 0644 "$1" "${APT_KEYRING_PATH}"
cat > "${APT_SOURCE_LIST_PATH}" <<'EOF'
${APT_SOURCE_ENTRY}
EOF
apt-get update
`,
      { mode: 0o700 }
    );

    await runPrivilegedSetupScript(scriptPath, keyPath);
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }

  return getLinuxAptSetupStatus();
}
