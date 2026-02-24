import { useSyncExternalStore } from "react";

import { getApiBaseUrl } from "@/lib/backend-url";

export type BackendStatus = "waking" | "ready" | "error";

type BackendStatusState = {
  status: BackendStatus;
  indicatorVisible: boolean;
  errorMessage: string | null;
};

type BackendStatusListener = () => void;

const BACKEND_HEALTH_TIMEOUT_MS = 60_000;
const BACKEND_HEALTH_ENDPOINT = `${getApiBaseUrl()}/health`;
const BACKEND_UNAVAILABLE_MESSAGE = "⚠️ Backend unavailable. Please try again later.";

let backendStatusState: BackendStatusState = {
  status: "waking",
  indicatorVisible: false,
  errorMessage: null,
};

let wakeupPromise: Promise<void> | null = null;
const listeners = new Set<BackendStatusListener>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function setBackendStatusState(
  updater:
    | BackendStatusState
    | ((current: BackendStatusState) => BackendStatusState),
): void {
  const nextState =
    typeof updater === "function"
      ? updater(backendStatusState)
      : updater;

  if (
    nextState.status === backendStatusState.status &&
    nextState.indicatorVisible === backendStatusState.indicatorVisible &&
    nextState.errorMessage === backendStatusState.errorMessage
  ) {
    return;
  }

  backendStatusState = nextState;
  emitChange();
}

function showIndicatorForCurrentStatus() {
  setBackendStatusState((current) => ({
    ...current,
    indicatorVisible: true,
    errorMessage:
      current.status === "error"
        ? current.errorMessage ?? BACKEND_UNAVAILABLE_MESSAGE
        : null,
  }));
}

export class BackendUnavailableError extends Error {
  constructor(message = BACKEND_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = "BackendUnavailableError";
  }
}

export function getBackendStatusSnapshot(): BackendStatusState {
  return backendStatusState;
}

export function subscribeBackendStatus(listener: BackendStatusListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useBackendStatus(): BackendStatusState {
  return useSyncExternalStore(
    subscribeBackendStatus,
    getBackendStatusSnapshot,
    getBackendStatusSnapshot,
  );
}

export function markBackendReady(): void {
  setBackendStatusState((current) => ({
    ...current,
    status: "ready",
    indicatorVisible: false,
    errorMessage: null,
  }));
}

export function markBackendError(
  message: string = BACKEND_UNAVAILABLE_MESSAGE,
): void {
  setBackendStatusState((current) => ({
    ...current,
    status: "error",
    errorMessage: message,
    indicatorVisible: current.indicatorVisible,
  }));
}

export function handleBackendRequestStart(): BackendStatus {
  const { status } = backendStatusState;

  if (status === "waking") {
    showIndicatorForCurrentStatus();
    ensureBackendWakeup();
    return status;
  }

  if (status === "error") {
    showIndicatorForCurrentStatus();
    throw new BackendUnavailableError();
  }

  return status;
}

export function handleBackendResponse(response: Response): void {
  if (response.ok) {
    markBackendReady();
  }
}

export function handleBackendRequestFailure(error: unknown): void {
  if (error instanceof BackendUnavailableError) {
    return;
  }

  markBackendError();
  showIndicatorForCurrentStatus();
}

export function ensureBackendWakeup(): Promise<void> | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (backendStatusState.status === "ready") {
    return null;
  }

  if (wakeupPromise) {
    return wakeupPromise;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort("timeout");
  }, BACKEND_HEALTH_TIMEOUT_MS);

  wakeupPromise = fetch(BACKEND_HEALTH_ENDPOINT, {
    method: "GET",
    cache: "no-store",
    signal: controller.signal,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Health check failed with status ${response.status}.`);
      }
      markBackendReady();
    })
    .catch(() => {
      markBackendError();
    })
    .finally(() => {
      window.clearTimeout(timeoutId);
      wakeupPromise = null;
    });

  return wakeupPromise;
}
