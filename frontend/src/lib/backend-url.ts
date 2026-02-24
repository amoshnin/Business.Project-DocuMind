const DEFAULT_DEV_API_URL = "http://localhost:8000";
const DEFAULT_PROD_API_URL = "https://documind-fastapi-backend.onrender.com";

function normalizeBaseUrl(rawUrl: string): string {
  return rawUrl.trim().replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured && configured.trim()) {
    return normalizeBaseUrl(configured);
  }

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PROD_API_URL;
  }

  return DEFAULT_DEV_API_URL;
}
