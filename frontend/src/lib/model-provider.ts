export type ModelProvider = "groq" | "openai";

export const DOCUMIND_MODEL_PROVIDER = "DOCUMIND_MODEL_PROVIDER";

export function getModelProvider(): ModelProvider {
  if (typeof window === "undefined") {
    return "groq";
  }

  const storedProvider = window.localStorage.getItem(DOCUMIND_MODEL_PROVIDER);
  return storedProvider === "openai" ? "openai" : "groq";
}

export function setModelProvider(provider: ModelProvider) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DOCUMIND_MODEL_PROVIDER, provider);
}
