"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { FileText, Loader2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api-client";
import { handleBackendRequestStart, useBackendStatus } from "@/lib/backend-status";
import { getApiBaseUrl } from "@/lib/backend-url";
import { Citation } from "@/lib/citations";
import {
  clearDocumentSessionState,
  getDocumentSessionState,
  setDocumentSessionState,
} from "@/lib/document-session";
import { cn } from "@/lib/utils";

type UploadStage =
  | "idle"
  | "queued"
  | "processing"
  | "uploading"
  | "chunking"
  | "indexing"
  | "ready"
  | "error";

type UploadApiResponse = {
  chunks_generated?: number;
  indexed_chunks?: number;
  total_pages?: number;
  page_count?: number;
  filename?: string;
};

type UploadJobAcceptedResponse = {
  job_id: string;
  status: string;
};

type UploadJobStatusResponse = UploadApiResponse & {
  job_id: string;
  status: "queued" | "processing" | "chunking" | "indexing" | "completed" | "failed";
  pages_processed?: number;
  last_processed_page?: number;
  chunks_generated_so_far?: number;
  chunking_started_at?: number;
  indexing_started_at?: number;
  completed_at?: number;
  detail?: string;
};

type UploadedDocumentMetadata = {
  filename: string;
  totalPages: number | null;
  indexedChunks: number;
};

const API_BASE_URL = getApiBaseUrl();
const BACKEND_UPLOAD_ENDPOINT = `${API_BASE_URL}/api/v1/documents/upload`;
const BACKEND_ASYNC_UPLOAD_ENDPOINT = `${API_BASE_URL}/api/v1/documents/upload/async`;
const UPLOAD_JOB_TIMEOUT_MS = 4 * 60 * 1000;
const UPLOAD_JOB_POLL_INTERVAL_MS = 1200;

type DocumentPanelProps = {
  activeCitation: Citation | null;
  onDocumentReadyChange?: (ready: boolean) => void;
};

export function DocumentPanel({
  activeCitation,
  onDocumentReadyChange,
}: DocumentPanelProps) {
  const { status: backendStatus } = useBackendStatus();
  const inputRef = useRef<HTMLInputElement>(null);
  const chunkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isDragActive, setIsDragActive] = useState(false);
  const [stage, setStage] = useState<UploadStage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingFilename, setProcessingFilename] = useState<string | null>(null);
  const [uploadStartedAt, setUploadStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentUploadJobId, setCurrentUploadJobId] = useState<string | null>(null);
  const [uploadJobProgress, setUploadJobProgress] =
    useState<UploadJobStatusResponse | null>(null);
  const [uploadedDocument, setUploadedDocument] =
    useState<UploadedDocumentMetadata | null>(null);

  const clearChunkingTimer = () => {
    if (chunkingTimerRef.current) {
      clearTimeout(chunkingTimerRef.current);
      chunkingTimerRef.current = null;
    }
  };

  useEffect(() => clearChunkingTimer, []);

  useEffect(() => {
    const stored = getDocumentSessionState();
    if (!stored?.uploadedDocument) {
      onDocumentReadyChange?.(false);
      return;
    }

    setUploadedDocument(stored.uploadedDocument);
    setProcessingFilename(stored.uploadedDocument.filename);
    setStage("ready");
    onDocumentReadyChange?.(true);
  }, [onDocumentReadyChange]);

  useEffect(() => {
    if (uploadStartedAt === null) {
      setElapsedSeconds(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - uploadStartedAt) / 1000)));
    }, 1000);

    setElapsedSeconds(Math.max(0, Math.floor((Date.now() - uploadStartedAt) / 1000)));
    return () => window.clearInterval(intervalId);
  }, [uploadStartedAt]);

  const getStageLabel = (value: UploadStage) => {
    if (value === "queued") return "Queued on Server...";
    if (value === "processing") return "Starting Processing...";
    if (value === "uploading") return "Uploading...";
    if (value === "chunking") return "Chunking Document...";
    if (value === "indexing") return "Indexing Chunks...";
    if (value === "ready") return "Ready";
    if (value === "error") return "Upload failed";
    return "No document uploaded";
  };

  const getIndexedChunks = (response: UploadApiResponse) =>
    response.chunks_generated ?? response.indexed_chunks ?? 0;

  const isProcessing =
    stage === "queued" ||
    stage === "processing" ||
    stage === "uploading" ||
    stage === "chunking" ||
    stage === "indexing";
  const isBackendReady = backendStatus === "ready";

  const getStageStepIndex = (value: UploadStage) => {
    if (value === "queued" || value === "processing") return 1;
    if (value === "uploading") return 1;
    if (value === "chunking") return 2;
    if (value === "indexing") return 3;
    if (value === "ready") return 3;
    return 0;
  };

  const getStageDescription = (value: UploadStage) => {
    if (!isBackendReady && !isProcessing) {
      return backendStatus === "waking"
        ? "Backend is starting up. Upload will be enabled automatically when ready."
        : "Backend is unavailable. Please try again later.";
    }

    if (value === "queued") {
      return "Waiting for the backend worker to start your upload job.";
    }
    if (value === "processing") {
      return "Server accepted the file and is preparing the chunking pipeline.";
    }
    if (value === "uploading") {
      return "Sending your PDF to the backend.";
    }
    if (value === "chunking") {
      return "Extracting text and splitting the document into chunks.";
    }
    if (value === "indexing") {
      return "Saving chunks and preparing retrieval.";
    }
    if (value === "ready") {
      return "Document is indexed and ready for chat.";
    }
    if (value === "error") {
      return "Document processing stopped before completion.";
    }
    return "Upload a PDF to begin.";
  };

  const canStartUpload = () => {
    if (isProcessing) {
      return false;
    }

    try {
      return handleBackendRequestStart() === "ready";
    } catch {
      return false;
    }
  };

  const openFilePickerIfAllowed = () => {
    if (!canStartUpload()) {
      return;
    }

    inputRef.current?.click();
  };

  const formatElapsed = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatPercent = (value: number) => `${Math.round(value)}%`;

  const getChunkingProgress = () => {
    if (!uploadJobProgress) return null;
    const totalPages = uploadJobProgress.total_pages;
    const pagesProcessed = uploadJobProgress.pages_processed;
    if (
      typeof totalPages !== "number" ||
      totalPages <= 0 ||
      typeof pagesProcessed !== "number"
    ) {
      return null;
    }

    const clampedProcessed = Math.max(0, Math.min(totalPages, pagesProcessed));
    return {
      totalPages,
      pagesProcessed: clampedProcessed,
      percent: (clampedProcessed / totalPages) * 100,
      chunksGeneratedSoFar:
        uploadJobProgress.chunks_generated_so_far ??
        uploadJobProgress.chunks_generated ??
        0,
    };
  };

  const getChunkingEtaSeconds = () => {
    if (stage !== "chunking" || !uploadJobProgress) return null;
    const totalPages = uploadJobProgress.total_pages;
    const pagesProcessed = uploadJobProgress.pages_processed;
    const chunkingStartedAt = uploadJobProgress.chunking_started_at;
    if (
      typeof totalPages !== "number" ||
      totalPages <= 0 ||
      typeof pagesProcessed !== "number" ||
      pagesProcessed <= 0 ||
      pagesProcessed >= totalPages ||
      typeof chunkingStartedAt !== "number"
    ) {
      return null;
    }

    const elapsed = Math.max(0, Date.now() / 1000 - chunkingStartedAt);
    if (elapsed <= 0) return null;

    const secondsPerPage = elapsed / pagesProcessed;
    const remainingPages = totalPages - pagesProcessed;
    return Math.max(0, Math.round(secondsPerPage * remainingPages));
  };

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms);
    });

  async function pollUploadJob(jobId: string): Promise<UploadApiResponse> {
    const deadline = Date.now() + UPLOAD_JOB_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const response = await apiFetch(
        `${API_BASE_URL}/api/v1/documents/jobs/${encodeURIComponent(jobId)}`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { detail?: string }
          | null;
        throw new Error(
          body?.detail ?? `Upload status failed with ${response.status}.`,
        );
      }

      const statusPayload = (await response.json()) as UploadJobStatusResponse;
      setUploadJobProgress(statusPayload);

      if (statusPayload.status === "queued") {
        setStage("queued");
        await sleep(UPLOAD_JOB_POLL_INTERVAL_MS);
        continue;
      }

      if (statusPayload.status === "processing") {
        setStage("processing");
        await sleep(UPLOAD_JOB_POLL_INTERVAL_MS);
        continue;
      }

      if (statusPayload.status === "chunking") {
        setStage("chunking");
        await sleep(UPLOAD_JOB_POLL_INTERVAL_MS);
        continue;
      }

      if (statusPayload.status === "indexing") {
        setStage("indexing");
        await sleep(UPLOAD_JOB_POLL_INTERVAL_MS);
        continue;
      }

      if (statusPayload.status === "completed") {
        setUploadJobProgress(statusPayload);
        return statusPayload;
      }

      if (statusPayload.status === "failed") {
        setUploadJobProgress(statusPayload);
        throw new Error(statusPayload.detail ?? "Document processing failed.");
      }

      await sleep(UPLOAD_JOB_POLL_INTERVAL_MS);
    }

    throw new Error(
      "Upload processing timed out on the server. Try a smaller PDF or retry.",
    );
  }

  async function uploadDocumentSyncFallback(
    formData: FormData,
  ): Promise<UploadApiResponse> {
    const response = await apiFetch(BACKEND_UPLOAD_ENDPOINT, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const fallbackError = `Upload failed with status ${response.status}.`;
      const body = (await response.json().catch(() => null)) as
        | { detail?: string }
        | null;
      throw new Error(body?.detail ?? fallbackError);
    }

    return (await response.json()) as UploadApiResponse;
  }

  async function uploadDocument(file: File) {
    clearChunkingTimer();
    setErrorMessage(null);
    setUploadJobProgress(null);
    setStage("uploading");

    const formData = new FormData();
    formData.append("file", file);

    chunkingTimerRef.current = setTimeout(() => {
      setStage((current) => (current === "uploading" ? "processing" : current));
    }, 700);

    try {
      let payload: UploadApiResponse;
      setProcessingFilename(file.name);
      setUploadStartedAt(Date.now());
      setCurrentUploadJobId(null);
      const asyncResponse = await apiFetch(BACKEND_ASYNC_UPLOAD_ENDPOINT, {
        method: "POST",
        body: formData,
      });

      if (asyncResponse.ok) {
        const accepted = (await asyncResponse.json()) as UploadJobAcceptedResponse;
        setCurrentUploadJobId(accepted.job_id);
        payload = await pollUploadJob(accepted.job_id);
      } else if (asyncResponse.status === 404 || asyncResponse.status === 405) {
        // Backward compatibility if backend has not been redeployed yet.
        payload = await uploadDocumentSyncFallback(formData);
      } else {
        const fallbackError = `Upload failed with status ${asyncResponse.status}.`;
        const body = (await asyncResponse.json().catch(() => null)) as
          | { detail?: string }
          | null;
        throw new Error(body?.detail ?? fallbackError);
      }

      clearChunkingTimer();

      const nextUploadedDocument = {
        filename: payload.filename ?? file.name,
        totalPages: payload.total_pages ?? payload.page_count ?? null,
        indexedChunks: getIndexedChunks(payload),
      };
      setUploadedDocument(nextUploadedDocument);
      setDocumentSessionState(nextUploadedDocument);
      setStage("ready");
      setUploadStartedAt(null);
      setCurrentUploadJobId(null);
      onDocumentReadyChange?.(true);
    } catch (error) {
      clearChunkingTimer();
      setStage("error");
      setUploadStartedAt(null);
      setUploadedDocument(null);
      setProcessingFilename(null);
      setCurrentUploadJobId(null);
      clearDocumentSessionState();
      onDocumentReadyChange?.(false);
      setErrorMessage(
        error instanceof Error ? error.message : "Unexpected upload error.",
      );
    }
  }

  const onFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!canStartUpload()) {
      event.target.value = "";
      return;
    }

    if (file.type !== "application/pdf") {
      setStage("error");
      onDocumentReadyChange?.(false);
      setErrorMessage("Only PDF files are supported.");
      event.target.value = "";
      return;
    }

    await uploadDocument(file);
    event.target.value = "";
  };

  const onDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    if (!canStartUpload()) {
      return;
    }

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setStage("error");
      onDocumentReadyChange?.(false);
      setErrorMessage("Only PDF files are supported.");
      return;
    }

    await uploadDocument(file);
  };

  return (
    <Card className="flex min-h-0 flex-col overflow-hidden">
      <CardHeader className="gap-1">
        <CardTitle className="text-base">Document Context & Citations</CardTitle>
        <CardDescription>
          Upload a PDF to index chunks and ground upcoming answers.
        </CardDescription>
      </CardHeader>
      <Separator />
      <ScrollArea className="min-h-0 flex-1">
        <CardContent className="space-y-6 p-4">
          <div className="space-y-3">
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={onFileSelected}
            />
            <div
              role="button"
              tabIndex={isProcessing ? -1 : 0}
              aria-disabled={isProcessing || !isBackendReady}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openFilePickerIfAllowed();
                }
              }}
              onClick={openFilePickerIfAllowed}
              onDragOver={(event) => {
                event.preventDefault();
                if (!isProcessing && isBackendReady) {
                  setIsDragActive(true);
                }
              }}
              onDragLeave={() => setIsDragActive(false)}
              onDrop={onDrop}
              className={cn(
                "rounded-lg border border-dashed p-6 text-center transition-colors",
                !isProcessing && !isBackendReady && "cursor-not-allowed opacity-70",
                isProcessing && "cursor-not-allowed opacity-70",
                isDragActive && isBackendReady && !isProcessing
                  ? "border-primary bg-primary/5"
                  : "border-border",
              )}
            >
              <UploadCloud className="mx-auto mb-2 size-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                Drag and drop PDF here, or click to upload
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supported format: PDF
              </p>
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span
                  className={cn(
                    "flex items-center gap-2",
                    stage === "error" ? "text-destructive" : "text-foreground",
                  )}
                >
                  {isProcessing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileText className="size-4" />
                  )}
                  {getStageLabel(stage)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isProcessing}
                  onClick={openFilePickerIfAllowed}
                >
                  Select File
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {getStageDescription(stage)}
              </p>
              {isProcessing ? (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-3 gap-1" aria-hidden="true">
                    {["Upload", "Chunk", "Index"].map((stepLabel, index) => {
                      const stepNumber = index + 1;
                      const currentStep = getStageStepIndex(stage);
                      const completed = stepNumber < currentStep;
                      const active = stepNumber === currentStep;
                      return (
                        <div key={stepLabel} className="space-y-1">
                          <div
                            className={cn(
                              "h-1.5 rounded-full transition-colors",
                              completed && "bg-primary",
                              active && "bg-primary/70 animate-pulse",
                              !completed && !active && "bg-border",
                            )}
                          />
                          <p className="text-[10px] text-muted-foreground">
                            {stepLabel}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>Elapsed: {formatElapsed(elapsedSeconds)}</span>
                    {stage === "chunking" && getChunkingEtaSeconds() !== null ? (
                      <span>
                        ETA: {formatElapsed(getChunkingEtaSeconds() ?? 0)}
                      </span>
                    ) : null}
                    {processingFilename ? (
                      <span className="truncate">
                        File: <span className="font-medium">{processingFilename}</span>
                      </span>
                    ) : null}
                    {currentUploadJobId ? (
                      <span>
                        Job: <span className="font-mono">{currentUploadJobId.slice(0, 8)}</span>
                      </span>
                    ) : null}
                  </div>
                  {(() => {
                    const chunkingProgress = getChunkingProgress();
                    if (!chunkingProgress) return null;
                    return (
                      <div className="space-y-1 rounded border bg-background/60 px-2 py-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-muted-foreground">
                            Pages:{" "}
                            <span className="font-medium text-foreground">
                              {chunkingProgress.pagesProcessed}/{chunkingProgress.totalPages}
                            </span>
                          </span>
                          <span className="text-muted-foreground">
                            {formatPercent(chunkingProgress.percent)}
                          </span>
                        </div>
                        <div
                          className="h-1.5 rounded-full bg-border"
                          aria-hidden="true"
                        >
                          <div
                            className="h-full rounded-full bg-primary transition-[width]"
                            style={{ width: `${chunkingProgress.percent}%` }}
                          />
                        </div>
                        <div className="text-muted-foreground">
                          Chunks generated so far:{" "}
                          <span className="font-medium text-foreground">
                            {chunkingProgress.chunksGeneratedSoFar}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : null}
            </div>
            {errorMessage ? (
              <p className="text-xs text-destructive">{errorMessage}</p>
            ) : null}
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Document Metadata</h3>
            {uploadedDocument ? (
              <div className="space-y-2 rounded-md border bg-card p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Filename</span>
                  <span className="truncate font-medium">
                    {uploadedDocument.filename}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Total Pages</span>
                  <span className="font-medium">
                    {uploadedDocument.totalPages ?? "Not returned"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Indexed Chunks</span>
                  <span className="font-medium">
                    {uploadedDocument.indexedChunks}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No document metadata available yet.
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Active Citation</h3>
            {activeCitation ? (
              <Card className="border-primary/40 bg-primary/5 shadow-none">
                <CardHeader className="gap-2 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Source Chunk
                  </p>
                  <p className="text-sm leading-relaxed">
                    {activeCitation.source_text}
                  </p>
                  <Separator />
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Filename</span>
                    <span className="truncate text-right font-medium text-foreground">
                      {activeCitation.metadata?.filename ?? "Unknown"}
                    </span>
                    <span>Page Number</span>
                    <span className="text-right font-medium text-foreground">
                      {activeCitation.metadata?.page_number ?? "Unknown"}
                    </span>
                  </div>
                </CardHeader>
              </Card>
            ) : (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Click a citation badge in chat to inspect its source chunk.
              </div>
            )}
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
