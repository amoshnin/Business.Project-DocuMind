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
import { Citation } from "@/lib/citations";
import { cn } from "@/lib/utils";

type UploadStage = "idle" | "uploading" | "chunking" | "ready" | "error";

type UploadApiResponse = {
  chunks_generated?: number;
  indexed_chunks?: number;
  total_pages?: number;
  page_count?: number;
  filename?: string;
};

type UploadedDocumentMetadata = {
  filename: string;
  totalPages: number | null;
  indexedChunks: number;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const BACKEND_UPLOAD_ENDPOINT = `${API_BASE_URL}/api/v1/documents/upload`;

type DocumentPanelProps = {
  activeCitation: Citation | null;
};

export function DocumentPanel({ activeCitation }: DocumentPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const chunkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isDragActive, setIsDragActive] = useState(false);
  const [stage, setStage] = useState<UploadStage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedDocument, setUploadedDocument] =
    useState<UploadedDocumentMetadata | null>(null);

  const clearChunkingTimer = () => {
    if (chunkingTimerRef.current) {
      clearTimeout(chunkingTimerRef.current);
      chunkingTimerRef.current = null;
    }
  };

  useEffect(() => clearChunkingTimer, []);

  const getStageLabel = (value: UploadStage) => {
    if (value === "uploading") return "Uploading...";
    if (value === "chunking") return "Chunking Document...";
    if (value === "ready") return "Ready";
    if (value === "error") return "Upload failed";
    return "No document uploaded";
  };

  const getIndexedChunks = (response: UploadApiResponse) =>
    response.chunks_generated ?? response.indexed_chunks ?? 0;

  async function uploadDocument(file: File) {
    clearChunkingTimer();
    setErrorMessage(null);
    setStage("uploading");

    const formData = new FormData();
    formData.append("file", file);

    chunkingTimerRef.current = setTimeout(() => {
      setStage((current) => (current === "uploading" ? "chunking" : current));
    }, 700);

    try {
      const response = await fetch(BACKEND_UPLOAD_ENDPOINT, {
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

      const payload = (await response.json()) as UploadApiResponse;
      clearChunkingTimer();

      setUploadedDocument({
        filename: payload.filename ?? file.name,
        totalPages: payload.total_pages ?? payload.page_count ?? null,
        indexedChunks: getIndexedChunks(payload),
      });
      setStage("ready");
    } catch (error) {
      clearChunkingTimer();
      setStage("error");
      setUploadedDocument(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Unexpected upload error.",
      );
    }
  }

  const onFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setStage("error");
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

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setStage("error");
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
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragActive(true);
              }}
              onDragLeave={() => setIsDragActive(false)}
              onDrop={onDrop}
              className={cn(
                "rounded-lg border border-dashed p-6 text-center transition-colors",
                isDragActive ? "border-primary bg-primary/5" : "border-border",
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
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span
                className={cn(
                  "flex items-center gap-2",
                  stage === "error" ? "text-destructive" : "text-foreground",
                )}
              >
                {stage === "uploading" || stage === "chunking" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileText className="size-4" />
                )}
                {getStageLabel(stage)}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => inputRef.current?.click()}
              >
                Select File
              </Button>
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
