import type { AiSettings } from "@shared/appTypes";
import type { TextGenerationRequest, TextGenerationResult, TextGenerators } from "@main/types/ai/textGeneration.types";
import { generateCloudText } from "./cloudTextGeneration";
import { generateLocalText } from "./localTextGeneration";
import { generateRuntimeText } from "./runtimeTextGeneration";

const generators: TextGenerators = { cloud: generateCloudText, local: generateLocalText, runtime: generateRuntimeText };

/** An explicit source never silently falls back to a different account or billing method. */
export async function generateSimpleText(settings: AiSettings, request: TextGenerationRequest,
  sources: TextGenerators = generators): Promise<TextGenerationResult> {
  request.signal?.throwIfAborted();
  switch (settings.simpleTaskProvider) {
    case "cloud": return sources.cloud(settings, request);
    case "local": return { text: await sources.local(settings.localLlmModelId, request), provider: "local" };
    case "codex":
    case "claude": return { text: await sources.runtime(settings.simpleTaskProvider, request), provider: settings.simpleTaskProvider };
  }
}
