export const DOCUMIND_USER_KEY = "DOCUMIND_USER_KEY";

export function getUserApiKey(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const key = window.localStorage.getItem(DOCUMIND_USER_KEY);
  if (!key) {
    return null;
  }

  const trimmedKey = key.trim();
  return trimmedKey.length > 0 ? trimmedKey : null;
}

export function setUserApiKey(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DOCUMIND_USER_KEY, key.trim());
}

export function clearUserApiKey() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(DOCUMIND_USER_KEY);
}
