const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const CHAT_STREAM_ENDPOINT = `${API_BASE_URL}/api/v1/chat/stream`;
const SESSION_STORAGE_KEY = "documind_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") {
    return "00000000-0000-0000-0000-000000000000";
  }

  const existingSessionId = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existingSessionId) {
    return existingSessionId;
  }

  const newSessionId = window.crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
  return newSessionId;
}

export async function submitQuery(query: string): Promise<Response> {
  const response = await fetch(CHAT_STREAM_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: getSessionId(),
      query,
    }),
  });

  if (!response.ok) {
    const fallbackMessage = `Request failed with status ${response.status}.`;
    const body = (await response.json().catch(() => null)) as
      | { detail?: string }
      | null;
    throw new Error(body?.detail ?? fallbackMessage);
  }

  return response;
}
