import type { AiSettings, AiSimpleTaskProvider } from "@shared/appTypes";
import type { TextGenerationRequest, TextGenerationResult, TextGenerators } from "@main/types/ai/textGeneration.types";
import { generateCloudText } from "./cloudTextGeneration";
import { generateLocalText } from "./localTextGeneration";
import { generateRuntimeText } from "./runtimeTextGeneration";

const generators: TextGenerators = { cloud: generateCloudText, local: generateLocalText, runtime: generateRuntimeText };

/** An explicit source never silently falls back to a different account or billing method. */
async function generateFromSource(settings: AiSettings, source: AiSimpleTaskProvider, runtimeModel: string | null,
  request: TextGenerationRequest, sources: TextGenerators): Promise<TextGenerationResult> {
  request.signal?.throwIfAborted();
  switch (source) {
    case "cloud": return sources.cloud(settings, request);
    case "local": return { text: await sources.local(settings.localLlmModelId, request), provider: "local", model: settings.localLlmModelId, usage: null };
    case "codex":
    case "claude": return { ...await sources.runtime(source, request, runtimeModel), provider: source };
  }
}

/** Commit messages, thread names and group routing: the simple-task source and, for a runtime, its chosen model. */
export function generateSimpleText(settings: AiSettings, request: TextGenerationRequest, sources: TextGenerators = generators): Promise<TextGenerationResult> {
  const source = settings.simpleTaskProvider;
  return generateFromSource(settings, source, source === "local" || source === "cloud" ? null : settings.runtimeModelByProvider[source], request, sources);
}

/** Background memory reviews use their own source and model, which can never be an on-device model. */
export function generateMemoryReviewText(settings: AiSettings, request: TextGenerationRequest, sources: TextGenerators = generators): Promise<TextGenerationResult> {
  return generateFromSource(settings, settings.memoryReview.provider, settings.memoryReview.runtimeModel, request, sources);
}
