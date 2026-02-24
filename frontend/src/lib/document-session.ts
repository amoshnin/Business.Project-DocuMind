import { getSessionId } from "@/lib/chat-api";

export type PersistedUploadedDocumentMetadata = {
  filename: string;
  totalPages: number | null;
  indexedChunks: number;
};

type DocumentSessionState = {
  ready: boolean;
  uploadedDocument: PersistedUploadedDocumentMetadata | null;
  updatedAt: number;
};

const DOCUMENT_SESSION_STORAGE_PREFIX = "documind_document_";

function getDocumentSessionStorageKey(): string {
  return `${DOCUMENT_SESSION_STORAGE_PREFIX}${getSessionId()}`;
}

export function getDocumentSessionState(): DocumentSessionState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(getDocumentSessionStorageKey());
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DocumentSessionState>;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      parsed.ready !== true ||
      typeof parsed.uploadedDocument !== "object" ||
      parsed.uploadedDocument === null
    ) {
      window.localStorage.removeItem(getDocumentSessionStorageKey());
      return null;
    }

    const doc = parsed.uploadedDocument as Partial<PersistedUploadedDocumentMetadata>;
    if (typeof doc.filename !== "string" || typeof doc.indexedChunks !== "number") {
      window.localStorage.removeItem(getDocumentSessionStorageKey());
      return null;
    }

    return {
      ready: true,
      uploadedDocument: {
        filename: doc.filename,
        totalPages:
          typeof doc.totalPages === "number" || doc.totalPages === null
            ? doc.totalPages
            : null,
        indexedChunks: doc.indexedChunks,
      },
      updatedAt:
        typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    window.localStorage.removeItem(getDocumentSessionStorageKey());
    return null;
  }
}

export function setDocumentSessionState(
  uploadedDocument: PersistedUploadedDocumentMetadata,
) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: DocumentSessionState = {
    ready: true,
    uploadedDocument,
    updatedAt: Date.now(),
  };
  window.localStorage.setItem(
    getDocumentSessionStorageKey(),
    JSON.stringify(payload),
  );
}

export function clearDocumentSessionState() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getDocumentSessionStorageKey());
}

export function hasRetainedDocumentSession(): boolean {
  return getDocumentSessionState() !== null;
}
