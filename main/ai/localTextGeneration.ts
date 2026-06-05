import type { LocalLlmModelId } from "@shared/appTypes";
import type { LocalTextGenerationRequest } from "@main/types/localTextGeneration.types";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getLocalAiModelStatus, getLocalLlmModelPath } from "./localAiModels";
import { buildLocalLlamaRuntimeEnv, getLocalLlamaExecutablePath } from "./localAiRuntime";
import { extractLlamaCliStdout } from "./localLlamaOutput";

const execFileAsync = promisify(execFile);

const DEFAULT_MAX_OUTPUT_TOKENS = 96;
const GENERATION_TIMEOUT_MS = 90_000;

export async function generateLocalText(
  modelId: LocalLlmModelId,
  request: LocalTextGenerationRequest,
  maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS
): Promise<string> {
  const status = await getLocalAiModelStatus(modelId);
  if (status.state !== "installed") {
    throw new Error("Install the selected local model in Settings -> AI before using on-device generation.");
  }

  const llamaCliPath = await getLocalLlamaExecutablePath();
  if (!llamaCliPath) {
    throw new Error("Install the llama.cpp runtime in Settings -> AI before using on-device generation.");
  }

  const modelPath = getLocalLlmModelPath(modelId);
  const { executablePath, args } = buildLlamaCliInvocation(
    llamaCliPath,
    modelPath,
    request,
    maxOutputTokens
  );

  try {
    const { stdout } = await execFileAsync(executablePath, args, {
      maxBuffer: 1024 * 1024 * 4,
      encoding: "utf8",
      env: buildLocalLlamaRuntimeEnv(executablePath),
      timeout: GENERATION_TIMEOUT_MS
    });
    const text = extractLlamaCliStdout(stdout);
    if (!text) {
      throw new Error("Local model returned no text.");
    }
    return text;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Local model returned no text.")) {
      throw error;
    }
    const detail = error instanceof Error ? error.message : "Unknown local model error.";
    throw new Error(`Local model generation failed: ${detail}`);
  }
}

function buildLlamaCliInvocation(
  executablePath: string,
  modelPath: string,
  request: LocalTextGenerationRequest,
  maxOutputTokens: number
): { executablePath: string; args: string[] } {
  return {
    executablePath,
    args: [
      "-m",
      modelPath,
      "-sys",
      request.system,
      "-p",
      request.user,
      "-n",
      String(maxOutputTokens),
      "--temp",
      "0.2",
      "--single-turn",
      "--simple-io",
      "--log-disable"
    ]
  };
}
