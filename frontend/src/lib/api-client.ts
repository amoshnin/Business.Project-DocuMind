import { clearUserApiKey, getUserApiKey } from "@/lib/api-key";
import { getModelProvider } from "@/lib/model-provider";
import { getRuntimeConfig } from "@/lib/runtime-config";

export const DOCUMIND_AUTH_ERROR_EVENT = "documind:auth-error";

function withApiKeyHeader(headersInit?: HeadersInit): Headers {
  const headers = new Headers(headersInit);
  const provider = getModelProvider();
  const apiKey = getUserApiKey();
  const runtimeConfig = getRuntimeConfig();

  headers.set("X-Model-Provider", provider);
  headers.set("X-Chunk-Size", `${runtimeConfig.chunkSize}`);
  headers.set("X-Chunk-Overlap", `${runtimeConfig.chunkOverlap}`);
  headers.set("X-Dense-K", `${runtimeConfig.denseK}`);
  headers.set("X-BM25-K", `${runtimeConfig.bm25K}`);
  headers.set("X-Dense-Weight", `${runtimeConfig.denseWeight}`);
  headers.set("X-Temperature", `${runtimeConfig.temperature}`);

  if (provider === "openai" && apiKey) {
    headers.set("X-OpenAI-Key", apiKey);
  }

  return headers;
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const provider = getModelProvider();
  const response = await fetch(input, {
    ...init,
    headers: withApiKeyHeader(init.headers),
  });

  if (response.status === 401) {
    if (provider === "openai") {
      clearUserApiKey();
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<{ message: string }>(DOCUMIND_AUTH_ERROR_EVENT, {
          detail: {
            message:
              provider === "openai"
                ? "Invalid OpenAI API key. Please update your key to continue."
                : "Provider authorization failed. Please review your AI Engine settings.",
          },
        }),
      );
    }
  }

  return response;
}
