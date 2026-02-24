"use client";

import { useBackendStatus } from "@/lib/backend-status";

export function BackendStatusBanner() {
  const { status, indicatorVisible, errorMessage } = useBackendStatus()

  if (!indicatorVisible || status === "ready") {
    return null
  }

  const isWaking = status === "waking"
  const message = isWaking
    ? "⏳ Backend is starting up, please wait…"
    : (errorMessage ?? "⚠️ Backend unavailable. Please try again later.")

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className={
          isWaking
            ? "rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 shadow-sm backdrop-blur dark:text-amber-200"
            : "rounded-full border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive shadow-sm backdrop-blur"
        }
      >
        {message}
      </div>
    </div>
  )
}
