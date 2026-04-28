import { noraToolingClient } from "@/components/app/clients/noraToolingClient";
import type { UseAiModelCatalogArgs, UseAiModelCatalogResult } from "@/components/app/types/appHooks.types";
import type { AiModelCatalogEntry, AiProvider } from "@shared/appTypes";
import { useCallback, useEffect, useRef, useState } from "react";

const EMPTY_AI_MODEL_OPTIONS: Record<AiProvider, AiModelCatalogEntry[]> = {
  openai: [],
  google: [],
  anthropic: []
};

const EMPTY_AI_MODEL_LOADING: Record<AiProvider, boolean> = {
  openai: false,
  google: false,
  anthropic: false
};

const EMPTY_AI_MODEL_ERROR: Record<AiProvider, string | null> = {
  openai: null,
  google: null,
  anthropic: null
};

export function useAiModelCatalog({
  apiKeys,
  modelByProvider,
  preferredProvider,
  updateAiPreferredProvider,
  updateAiModel,
  captureError
}: UseAiModelCatalogArgs): UseAiModelCatalogResult {
  const [aiModelOptions, setAiModelOptions] = useState<Record<AiProvider, AiModelCatalogEntry[]>>(EMPTY_AI_MODEL_OPTIONS);
  const [aiModelLoading, setAiModelLoading] = useState<Record<AiProvider, boolean>>(EMPTY_AI_MODEL_LOADING);
  const [aiModelError, setAiModelError] = useState<Record<AiProvider, string | null>>(EMPTY_AI_MODEL_ERROR);
  const apiKeysRef = useRef(apiKeys);
  const modelByProviderRef = useRef(modelByProvider);
  const updateAiModelRef = useRef(updateAiModel);
  const updateAiPreferredProviderRef = useRef(updateAiPreferredProvider);

  useEffect(() => {
    apiKeysRef.current = apiKeys;
  }, [apiKeys]);

  useEffect(() => {
    modelByProviderRef.current = modelByProvider;
  }, [modelByProvider]);

  useEffect(() => {
    updateAiModelRef.current = updateAiModel;
  }, [updateAiModel]);

  useEffect(() => {
    updateAiPreferredProviderRef.current = updateAiPreferredProvider;
  }, [updateAiPreferredProvider]);

  const refreshAiModels = useCallback(async (provider: AiProvider): Promise<void> => {
    const apiKey = apiKeysRef.current[provider]?.trim() || "";
    if (!apiKey) {
      setAiModelOptions((current) => ({ ...current, [provider]: [] }));
      setAiModelError((current) => ({ ...current, [provider]: null }));
      return;
    }

    setAiModelLoading((current) => ({ ...current, [provider]: true }));
    setAiModelError((current) => ({ ...current, [provider]: null }));
    try {
      const result = await noraToolingClient.listAiModels({ provider, apiKey });
      setAiModelOptions((current) => ({ ...current, [provider]: result.models }));
      const selectedModel = modelByProviderRef.current[provider];
      if (result.models.length > 0 && !result.models.some((entry) => entry.id === selectedModel)) {
        await updateAiModelRef.current(provider, result.models[0].id);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load models.";
      setAiModelError((current) => ({ ...current, [provider]: message }));
    } finally {
      setAiModelLoading((current) => ({ ...current, [provider]: false }));
    }
  }, []);

  const handleSelectAiChatProviderModel = useCallback(async (provider: AiProvider, model: string): Promise<void> => {
    try {
      if (preferredProvider !== provider) {
        await updateAiPreferredProviderRef.current(provider);
      }
      await updateAiModelRef.current(provider, model);
    } catch (error: unknown) {
      captureError(error);
    }
  }, [captureError, preferredProvider]);

  useEffect(() => {
    const providers: AiProvider[] = ["openai", "google", "anthropic"];
    providers.forEach((provider) => {
      void refreshAiModels(provider);
    });
  }, [apiKeys.anthropic, apiKeys.google, apiKeys.openai, refreshAiModels]);

  return {
    aiModelOptions,
    aiModelLoading,
    aiModelError,
    refreshAiModels,
    handleSelectAiChatProviderModel
  };
}
