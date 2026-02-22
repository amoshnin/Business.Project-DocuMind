import { clearUserApiKey, getUserApiKey } from "@/lib/api-key";

export const DOCUMIND_AUTH_ERROR_EVENT = "documind:auth-error";

function withApiKeyHeader(headersInit?: HeadersInit): Headers {
  const headers = new Headers(headersInit);
  const apiKey = getUserApiKey();

  if (apiKey) {
    headers.set("X-OpenAI-Key", apiKey);
  }

  return headers;
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    headers: withApiKeyHeader(init.headers),
  });

  if (response.status === 401) {
    clearUserApiKey();

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<{ message: string }>(DOCUMIND_AUTH_ERROR_EVENT, {
          detail: {
            message:
              "Invalid API key. Please update your OpenAI key to continue.",
          },
        }),
      );
    }
  }

  return response;
}
