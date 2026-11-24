import type { LocalVoiceRuntimeStatus } from "@shared/appTypes";
import type { LocalVoiceEngine, SherpaOnnxModelSource } from "@main/types/localVoice.types";
import { app } from "electron";
import { execFile } from "node:child_process";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { downloadToFile, extractTarBz2, isExecutableFile, platformExecutableName } from "./files";

const execFileAsync = promisify(execFile);

/** Pinned so a new upstream release can't change CLI output under us; bump deliberately. */
const SHERPA_ONNX_VERSION = "v1.13.8";
const SHERPA_ONNX_RELEASE_URL = `https://github.com/k2-fsa/sherpa-onnx/releases/download/${SHERPA_ONNX_VERSION}`;

/** The CPU-only, no-TTS shared build for each supported platform, or null where upstream ships none. */
export function sherpaOnnxRuntimeAsset(platform: NodeJS.Platform, arch: string): string | null {
  const build = platform === "darwin" ? (arch === "arm64" ? "osx-arm64-shared-no-tts" : arch === "x64" ? "osx-x64-shared-no-tts" : null)
    : platform === "linux" ? (arch === "x64" ? "linux-x64-shared-no-tts" : arch === "arm64" ? "linux-aarch64-shared-cpu" : null)
      : platform === "win32" ? (arch === "x64" ? "win-x64-shared-MT-Release-no-tts" : arch === "arm64" ? "win-arm64-shared-MT-Release-no-tts" : null)
        : null;
  return build ? `sherpa-onnx-${SHERPA_ONNX_VERSION}-${build}.tar.bz2` : null;
}

export function buildSherpaOnnxRuntimeDirectory(userDataPath: string): string {
  return path.join(userDataPath, "voice-runtime", "sherpa-onnx");
}

/** The archive keeps bin/ and lib/ side by side; the binary finds its libraries through @loader_path/../lib. */
function sherpaOnnxExecutablePath(): string {
  return path.join(buildSherpaOnnxRuntimeDirectory(app.getPath("userData")), "bin", platformExecutableName("sherpa-onnx-offline"));
}

async function getSherpaOnnxRuntimeStatus(): Promise<LocalVoiceRuntimeStatus> {
  const executablePath = sherpaOnnxExecutablePath();
  return await isExecutableFile(executablePath)
    ? { engine: "sherpaOnnx", state: "installed", executablePath }
    : { engine: "sherpaOnnx", state: "not-installed", executablePath: null };
}

async function installSherpaOnnxRuntime(): Promise<LocalVoiceRuntimeStatus> {
  const existing = await getSherpaOnnxRuntimeStatus();
  if (existing.state === "installed") {
    return existing;
  }
  const asset = sherpaOnnxRuntimeAsset(process.platform, process.arch);
  if (!asset) {
    throw new Error("sherpa-onnx has no build for this computer, so Parakeet models can't run here.");
  }

  const runtimeDirectory = buildSherpaOnnxRuntimeDirectory(app.getPath("userData"));
  const tempDirectory = await fsPromises.mkdtemp(path.join(os.tmpdir(), "nora-sherpa-onnx-"));
  try {
    const archivePath = path.join(tempDirectory, asset);
    await downloadToFile(`${SHERPA_ONNX_RELEASE_URL}/${asset}`, archivePath, "the sherpa-onnx runtime");
    const staged = path.join(tempDirectory, "runtime");
    await extractTarBz2(archivePath, staged);
    await fsPromises.rm(runtimeDirectory, { recursive: true, force: true });
    await fsPromises.mkdir(path.dirname(runtimeDirectory), { recursive: true });
    await fsPromises.cp(staged, runtimeDirectory, { recursive: true, verbatimSymlinks: true });
  } finally {
    await fsPromises.rm(tempDirectory, { recursive: true, force: true });
  }

  const status = await getSherpaOnnxRuntimeStatus();
  if (status.state !== "installed") {
    throw new Error("sherpa-onnx installation finished but Nora could not find sherpa-onnx-offline.");
  }
  return status;
}

/** sherpa-onnx-offline logs progress and prints each file's result as a JSON object with a `text` field. */
export function parseSherpaOnnxOutput(output: string): string {
  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{") || !trimmed.includes("\"text\"")) continue;
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && "text" in parsed && typeof parsed.text === "string") return parsed.text.trim();
    } catch {
      // Not the result line; keep looking.
    }
  }
  return "";
}

async function transcribeWithSherpaOnnx(source: SherpaOnnxModelSource, modelDirectory: string, wavPath: string): Promise<string> {
  const { executablePath } = await getSherpaOnnxRuntimeStatus();
  if (!executablePath) {
    throw new Error("Install the local voice model in Settings → Voice before using local dictation.");
  }
  const file = (name: string): string => path.join(modelDirectory, name);
  const args = [
    `--encoder=${file(source.files.encoder)}`,
    `--decoder=${file(source.files.decoder)}`,
    `--joiner=${file(source.files.joiner)}`,
    `--tokens=${file(source.files.tokens)}`,
    `--model-type=${source.modelType}`,
    `--num-threads=${Math.max(1, Math.min(4, os.availableParallelism()))}`,
    wavPath
  ];

  let output: { stdout: string; stderr: string };
  try {
    output = await execFileAsync(executablePath, args, { maxBuffer: 1024 * 1024 * 10, encoding: "utf8" });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown sherpa-onnx error.";
    throw new Error(`Local transcription failed: ${detail}`);
  }
  const transcript = parseSherpaOnnxOutput(`${output.stdout}\n${output.stderr}`);
  if (!transcript) {
    throw new Error("Local transcription returned no transcript. The recording may be silent or too short.");
  }
  return transcript;
}

export const sherpaOnnxEngine: LocalVoiceEngine<"sherpaOnnx"> = {
  id: "sherpaOnnx",
  getRuntimeStatus: getSherpaOnnxRuntimeStatus,
  installRuntime: installSherpaOnnxRuntime,
  transcribe: transcribeWithSherpaOnnx
};
