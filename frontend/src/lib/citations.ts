export type Citation = {
  source_text: string;
  metadata?: {
    document_id?: string;
    filename?: string;
    page_number?: number;
  };
};

export function getCitationKey(citation: Citation): string {
  return [
    citation.metadata?.document_id ?? "",
    citation.metadata?.filename ?? "",
    String(citation.metadata?.page_number ?? ""),
    citation.source_text,
  ].join("::");
}

export function getCitationBadgeLabel(
  citation: Citation,
  index: number,
): string {
  if (citation.metadata?.page_number) {
    return `[Page ${citation.metadata.page_number}]`;
  }

  return `[Citation ${index + 1}]`;
}
