import type { z } from "zod";
import { DIRECTORY_ROUTES, deleteRuntimeResponseSchema, directoryErrorSchema, listRuntimesResponseSchema, renameRuntimeRequestSchema,
  runtimeResponseSchema } from "@shared/remote-access/directory";
import type { DirectoryErrorCode } from "@shared/types/remote-access/directory.types";
import type { DirectoryClient, DirectoryClientConfig } from "@/types/directoryClient.types";
import type { HttpMethod } from "@/types/http.types";
import { normalizeBaseUrl } from "@/config/appConfig";
import { requestJson } from "@/api/http/requestJson";

export function createDirectoryClient(config: DirectoryClientConfig): DirectoryClient {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const call = <T>(method: HttpMethod, path: string, schema: z.ZodType<T>, body?: object): Promise<T> =>
    requestJson<T, DirectoryErrorCode>({
      service: "directory", method, url: `${baseUrl}${path}`, getToken: config.getToken, fetch: config.fetch,
      timeoutMs: config.timeoutMs, schema, errorSchema: directoryErrorSchema, ...(body === undefined ? {} : { body })
    });

  return {
    list: async () => (await call("GET", DIRECTORY_ROUTES.list, listRuntimesResponseSchema)).runtimes,
    rename: async (installationId, name) => {
      const body = renameRuntimeRequestSchema.parse({ name });
      return (await call("PATCH", DIRECTORY_ROUTES.runtime(installationId), runtimeResponseSchema, body)).runtime;
    },
    remove: async (installationId) => {
      await call("DELETE", DIRECTORY_ROUTES.runtime(installationId), deleteRuntimeResponseSchema);
    }
  };
}
