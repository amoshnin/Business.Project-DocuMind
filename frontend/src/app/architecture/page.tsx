import Link from "next/link"
import {
  ArrowLeft,
  BookOpenText,
  LockKeyhole,
  Rocket,
  Search,
  Shuffle,
} from "lucide-react"
import { type ComponentType } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

type ChapterSection = {
  heading: string
  paragraphs: string[]
  bullets?: string[]
  alert?: {
    title: string
    body: string
  }
  table?: {
    columns: string[]
    rows: string[][]
  }
}

type Chapter = {
  id: string
  title: string
  subtitle: string
  icon: ComponentType<{ className?: string }>
  sections: ChapterSection[]
}

const chapters: Chapter[] = [
  {
    id: "end-to-end-runtime",
    title: "Chapter 1: End-to-End Runtime Flow",
    subtitle: "How a request moves from UI input to grounded answer output",
    icon: Search,
    sections: [
      {
        heading: "1.1 Ingestion entrypoint and request contracts",
        paragraphs: [
          "PDF ingestion starts at `/api/v1/documents/upload`, where provider context is validated before file bytes are processed.",
          "Every request carries `X-Model-Provider`, and FastAPI dependency resolution enforces provider constraints early in the lifecycle.",
          "Missing filenames and empty payloads are rejected with explicit HTTP errors to keep client behavior deterministic.",
        ],
        bullets: [
          "Provider values are validated in `get_model_provider` before endpoint logic executes.",
          "OpenAI key format checks are centralized in `get_provider_context`.",
          "Groq server-key checks fail fast to surface misconfiguration predictably.",
        ],
      },
      {
        heading: "1.2 Conversational execution as a streaming pipeline",
        paragraphs: [
          "Chat requests are handled through `/api/v1/chat/stream` with a stable `session_id` and a `query` payload.",
          "Follow-up turns are reformulated against existing chat history before retrieval, then passed into generation.",
          "Responses are emitted as SSE events so token rendering begins immediately instead of waiting for full completion.",
        ],
        bullets: [
          "`token` events stream incremental assistant text.",
          "A `final` event carries the completed answer and typed citations.",
          "`[DONE]` terminates the stream for clean client state transitions.",
        ],
      },
      {
        heading: "1.3 Deterministic stream finalization",
        paragraphs: [
          "The backend tracks the finalized assistant answer during streaming and appends user/assistant turns to `session_store` after completion.",
          "This ordering ensures next-turn reformulation sees stable finalized content rather than partial token buffers.",
          "Stream lifecycle behavior is treated as a strict backend/frontend contract to avoid hidden side effects.",
        ],
      },
    ],
  },
  {
    id: "hybrid-retrieval-logic",
    title: "Chapter 2: Hybrid Retrieval Logic",
    subtitle: "Combining lexical and semantic search with rank fusion",
    icon: Search,
    sections: [
      {
        heading: "2.1 Retrieval responsibilities by failure mode",
        paragraphs: [
          "BM25 handles strict lexical anchors such as exact clauses, IDs, and policy terms that dense search may miss.",
          "Dense vector retrieval captures conceptual similarity when query phrasing diverges from source wording.",
          "Combining both branches improves recall while preserving precision under enterprise document variability.",
        ],
      },
      {
        heading: "2.2 Candidate merge with Reciprocal Rank Fusion",
        paragraphs: [
          "Direct score mixing is avoided because BM25 and dense scores operate on different numeric scales.",
          "`EnsembleRetriever` with balanced weights provides position-aware ranking that is less fragile than raw-score blending.",
          "Rank-based fusion remains stable as corpora, tokenization behavior, and model characteristics evolve.",
        ],
        bullets: [
          "Dense retrieval runs at `k=3` from Chroma for semantic candidates.",
          "BM25 retrieval runs at `k=3` from in-memory documents for lexical precision.",
          "Fusion weights `[0.5, 0.5]` keep behavior balanced and interpretable.",
        ],
      },
      {
        heading: "2.3 Startup hydration and retrieval continuity",
        paragraphs: [
          "Vectors are persisted to Chroma on disk, and BM25 memory is rebuilt from persisted records during app lifespan startup.",
          "Because BM25 is memory-resident in this design, hydration is required to preserve retrieval continuity after restarts.",
          "Hybrid retrieval quality depends on both branches being warm and synchronized.",
        ],
      },
    ],
  },
  {
    id: "pdf-parsing-context-stuffing",
    title: "Chapter 3: PDF ETL and Chunk Engineering",
    subtitle: "Converting raw PDFs into deterministic retrieval memory",
    icon: BookOpenText,
    sections: [
      {
        heading: "3.1 PDF extraction and page-level metadata",
        paragraphs: [
          "PDF files are parsed with PyMuPDF (`fitz`) page-by-page so extracted content remains tied to page boundaries.",
          "Empty pages are skipped, and metadata fields such as `source` and `page` are normalized for downstream consistency.",
          "Each page becomes a typed LangChain `Document`, which keeps later pipeline stages schema-safe.",
        ],
      },
      {
        heading: "3.2 Recursive chunking as a quality control lever",
        paragraphs: [
          "Chunking uses `RecursiveCharacterTextSplitter` with configurable `CHUNK_SIZE` and fixed overlap `150`.",
          "Overlap preserves clause continuity across boundaries and reduces edge-loss for legal or specification-heavy documents.",
          "Deterministic chunk topology is essential because unstable chunking degrades both retrieval quality and citation trust.",
        ],
      },
      {
        heading: "3.3 Storage loading and chunk identity",
        paragraphs: [
          "Each chunk receives a durable `chunk_id`, then is written into Chroma with explicit IDs for repeatable ingestion behavior.",
          "Vector persistence remains configurable via `CHROMA_PERSIST_DIR`.",
          "The same chunk corpus is kept in BM25 memory so lexical and semantic retrieval operate on aligned evidence units.",
        ],
      },
      {
        heading: "3.4 Context formatting for grounded generation",
        paragraphs: [
          "Retrieved chunks are formatted into numbered context blocks containing `document_id`, `filename`, and `page_number`.",
          "Metadata is made explicit so citation tool output can match source attributes exactly.",
          "This formatted context is the core bridge between retrieval truth and generation behavior.",
        ],
      },
    ],
  },
  {
    id: "llm-router-pattern",
    title: "Chapter 4: Prompt and Generation Orchestration",
    subtitle: "Grounded answer generation through strict prompt contracts",
    icon: Shuffle,
    sections: [
      {
        heading: "4.1 Retrieval intent separated from answer intent",
        paragraphs: [
          "Multi-turn input is reformulated into a standalone retrieval query when history exists.",
          "Retrieval uses the reformulated query, while generation uses the original user question plus chat history.",
          "This separation keeps retrieval precision and conversational coherence aligned without coupling the two concerns.",
        ],
      },
      {
        heading: "4.2 Citation integrity through structured outputs",
        paragraphs: [
          "System prompts prohibit outside knowledge and require citation metadata to match retrieved context exactly.",
          "Pydantic response models enforce typed outputs for non-streaming mode, including citation schema validation.",
          "`source_text` remains verbatim so claims can be audited directly against the uploaded document.",
        ],
      },
      {
        heading: "4.3 Single-pass streaming for text and citations",
        paragraphs: [
          "A `CitationTool` binding is attached during streaming generation while token text and tool-call fragments are accumulated concurrently.",
          "Tool-call JSON buffers are parsed at stream completion and emitted in a typed final payload.",
          "Single-pass streaming reduces latency and token overhead while preserving structured provenance.",
        ],
        bullets: [
          "Token events append into the live assistant message in real time.",
          "Tool-call chunks are parsed defensively so partial JSON does not break the stream.",
          "Final payloads are serialized through `ChatResponse` for deterministic client parsing.",
        ],
      },
      {
        heading: "4.4 Predictable behavior under insufficient context",
        paragraphs: [
          "Prompt rules require explicit context-insufficiency statements when evidence is missing.",
          "Citation arrays must be empty in that state to prevent fabricated provenance.",
          "This policy favors reliability over speculative completion in enterprise usage.",
        ],
      },
    ],
  },
  {
    id: "vendor-agnostic-router",
    title: "Chapter 5: Vendor-Agnostic LLM Router",
    subtitle: "One product surface with interchangeable model backends",
    icon: Rocket,
    sections: [
      {
        heading: "5.1 Provider routing by explicit API contract",
        paragraphs: [
          "Provider selection is routed through `X-Model-Provider` with allowed values `groq` and `openai`.",
          "Unsupported values are rejected with `400`, and checks remain centralized in dependency logic.",
          "This keeps control-plane behavior consistent across endpoints.",
        ],
      },
      {
        heading: "5.2 Model instantiation through a factory boundary",
        paragraphs: [
          "`get_llm` constructs provider-specific model clients while endpoint logic remains provider-neutral.",
          "Current runtime defaults are `gpt-4o-mini` for OpenAI and `llama3-8b-8192` for Groq-compatible execution at temperature `0`.",
          "Constructor isolation reduces blast radius when adding or changing providers.",
        ],
      },
      {
        heading: "5.3 Onboarding and governance as separate operating modes",
        paragraphs: [
          "Groq is configured as the default for low-friction onboarding and low-latency first-token behavior.",
          "OpenAI remains available through BYOK for teams that require quota ownership and governance controls.",
          "This dual-mode architecture is a deliberate anti-lock-in strategy, not a temporary compatibility layer.",
        ],
        table: {
          columns: ["Dimension", "Groq (Default)", "OpenAI (BYOK)"],
          rows: [
            [
              "Primary Advantage",
              "Fast onboarding and very low latency.",
              "User-controlled quota and policy governance.",
            ],
            [
              "Operational Risk",
              "Strict free-tier rate limits.",
              "Invalid or expired user credentials.",
            ],
            [
              "UX Recovery Path",
              "Retry guidance or provider switch after `429`.",
              "Key reset and settings reopen after `401`.",
            ],
          ],
        },
      },
    ],
  },
  {
    id: "decoupled-embeddings",
    title: "Chapter 6: Decoupled Embeddings and Index Stability",
    subtitle: "Retrieval infrastructure independent from generation engines",
    icon: Rocket,
    sections: [
      {
        heading: "6.1 Provider-independent embedding strategy",
        paragraphs: [
          "Indexing uses `HuggingFaceEmbeddings` (`all-MiniLM-L6-v2`) with `lru_cache` to reduce repeated initialization overhead.",
          "Embeddings remain decoupled from generation providers so model switching does not trigger re-indexing.",
          "This separation treats document memory as stable infrastructure while generation providers remain replaceable.",
        ],
      },
      {
        heading: "6.2 Retrieval stability across provider switches",
        paragraphs: [
          "Vector and BM25 corpora remain stable while providers are toggled, preserving retrieval consistency on the same document set.",
          "Expensive re-embedding loops are avoided during active sessions, keeping latency focused on retrieval plus generation.",
          "Provider switching does not reset document intelligence, reducing both cost and user friction.",
        ],
        bullets: [
          "Chunk identity remains stable through durable `chunk_id` values.",
          "Vector persistence remains durable through Chroma disk storage.",
          "Lexical and dense branches stay aligned on the same chunk corpus.",
        ],
      },
    ],
  },
  {
    id: "stateless-security-model",
    title: "Chapter 7: Stateless Security and BYOK",
    subtitle:
      "Credential control in the browser without server-side secret storage",
    icon: LockKeyhole,
    sections: [
      {
        heading: "7.1 Browser-owned API key model",
        paragraphs: [
          "User OpenAI keys remain in browser local storage and are not persisted in backend databases.",
          "Keys are injected only when OpenAI is selected and transmitted through `X-OpenAI-Key` over HTTPS.",
          "The server remains stateless with respect to user secrets, reducing compromise blast radius.",
        ],
      },
      {
        heading: "7.2 Auth recovery in the API client layer",
        paragraphs: [
          "Header injection is centralized in `apiFetch`, which always attaches `X-Model-Provider` for routing consistency.",
          "`401` responses trigger immediate local key clearing and dispatch a settings recovery event.",
          "Settings reopen with explicit error copy so remediation happens without losing broader chat context.",
        ],
        bullets: [
          "Stale credentials are cleared automatically after unauthorized responses.",
          "Groq mode remains key-free for frictionless onboarding.",
          "Provider preference state and key state are separated to avoid accidental lockouts.",
        ],
      },
    ],
  },
  {
    id: "frontend-runtime-ux",
    title: "Chapter 8: Frontend Runtime and Interaction Design",
    subtitle: "Streaming-first UI state machine for evidence-driven chat",
    icon: BookOpenText,
    sections: [
      {
        heading: "8.1 Readiness gates and workflow safety",
        paragraphs: [
          "Message submission remains disabled until prerequisites are satisfied: provider state, key state, and document readiness.",
          "Blocked reasons are rendered in the composer so users can resolve constraints without ambiguity.",
          "`New Session` remains hidden until the current session is used, preventing redundant state-reset actions.",
        ],
      },
      {
        heading: "8.2 Manual SSE parsing for deterministic rendering",
        paragraphs: [
          "The chat component reads `ReadableStream` directly and decodes incremental bytes with `TextDecoder`.",
          "SSE blocks are parsed on `\\n\\n` boundaries with support for multi-line `data:` payloads.",
          "Incoming token chunks append to the active assistant message for low-latency typing behavior without polling.",
        ],
        bullets: [
          "Typing indicators switch off after first-byte token receipt.",
          "Assistant messages finalize on the `final` event payload.",
          "Citations stay attached to the same completed assistant turn for traceability.",
        ],
      },
      {
        heading: "8.3 Cross-pane citation synchronization",
        paragraphs: [
          "`activeCitation` is lifted to the dashboard container and injected into both chat and document panes.",
          "Citation badges under assistant messages map directly to source chunk cards in the right panel.",
          "This split-pane interaction keeps provenance visible at the exact point of user intent.",
        ],
      },
    ],
  },
  {
    id: "system-resilience",
    title: "Chapter 9: Resilience, Performance, and Operational Discipline",
    subtitle:
      "Hardening failure paths while keeping latency and quality predictable",
    icon: LockKeyhole,
    sections: [
      {
        heading: "9.1 Vendor-specific failure mapping",
        paragraphs: [
          "Provider-specific exceptions are treated as first-class runtime states: Groq pressure as `429` and OpenAI auth issues as `401`.",
          "Backend semantics are paired with frontend recovery: invalid OpenAI credentials clear and reopen settings, while Groq limits preserve context and suggest retry or provider switch.",
          "Explicit failure semantics are favored over silent degradation to preserve operator and user trust.",
        ],
      },
      {
        heading: "9.2 Throughput optimization with asynchronous boundaries",
        paragraphs: [
          "CPU-heavy operations such as PDF extraction and retrieval writes are offloaded to `asyncio.to_thread` to preserve API responsiveness.",
          "The first stream event is pre-read before continuous yielding so immediate provider failures surface deterministically.",
          "Settings and embedding models are cached where safe to reduce repeated hot-path initialization overhead.",
        ],
        bullets: [
          "Provider-aware fallback paths reduce operational dead-ends.",
          "Session continuity is preserved across provider switches and retries.",
          "Latency remains stable through chunked streaming and incremental rendering.",
        ],
      },
      {
        heading: "9.3 Repeatable quality evaluation loops",
        paragraphs: [
          "A scripted evaluation loop runs over a golden dataset and scores faithfulness plus answer relevance with structured judge outputs.",
          "Quality is measured end-to-end rather than by isolated component metrics because retrieval and generation are tightly coupled in production.",
          "This evaluation loop acts as release discipline so architecture changes improve business outcomes, not just internal code aesthetics.",
        ],
      },
      {
        heading: "9.4 Durable product-system framing",
        paragraphs: [
          "DocuMind is designed to convert general LLM capability into reliable document-intelligence throughput for real teams.",
          "Retrieval rigor, provider abstraction, stateless security, and streaming UX are combined to maintain trust under enterprise load.",
          "The system is intentionally built as a platform architecture rather than a single-model demo so providers, prompts, and retrieval policies can evolve without replatforming.",
        ],
      },
    ],
  },
]

const architecturePrinciples = [
  "Ground every answer in retrievable evidence.",
  "Prefer explicit contracts over hidden coupling in every layer.",
  "Decouple retrieval, embeddings, and generation to preserve runtime flexibility.",
  "Prevent lock-in through provider abstraction and stateless security boundaries.",
  "Optimize for explainability, resilience, and operational clarity.",
  "Measure quality through repeatable evaluation loops before relying on intuition.",
]

const executiveWhatWeBuiltSections = [
  {
    title: "Runtime Orchestration",
    summary:
      "DocuMind orchestrates ingestion, retrieval, reformulation, generation, and citation rendering as one deterministic runtime pipeline.",
    whatBuilt:
      "The implementation combines strict endpoint contracts, streaming SSE semantics, typed payloads, and cross-pane citation linking so every answer remains traceable.",
    complexity: [
      "Backend stream events and frontend parser state machines are synchronized.",
      "Chat history persists in session flow while rendering remains low-latency.",
      "Error semantics stay explicit so recovery paths remain deterministic.",
    ],
  },
  {
    title: "Retrieval Intelligence",
    summary:
      "BM25 and dense retrieval are fused because enterprise queries fail across both lexical and semantic axes.",
    whatBuilt:
      "Hybrid retrieval, rank fusion, persistent vectors, and startup hydration of lexical memory were implemented as one coherent retrieval system.",
    complexity: [
      "Retrieval continuity survives restarts by rebuilding BM25 from disk-backed data.",
      "Chunk topology is tuned for both citation fidelity and answer coherence.",
      "Embedding infrastructure is isolated from generation infrastructure.",
    ],
  },
  {
    title: "Vendor-Agnostic Security",
    summary:
      "Provider routing remains abstract while user credential control stays local through BYOK.",
    whatBuilt:
      "The security model includes provider headers, conditional key injection, automatic 401 key invalidation, and settings-driven remediation UX.",
    complexity: [
      "Server-side logic remains stateless with respect to user secrets.",
      "Provider failure handling is explicit for both OpenAI and Groq paths.",
      "Operating modes remain flexible without divergent product surfaces.",
    ],
  },
]

export default function ArchitecturePage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto grid w-full max-w-[1700px] grid-cols-1 gap-6 p-4 lg:gap-8 lg:p-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-6 xl:h-[calc(100dvh-3rem)]">
          <Card className="flex h-full min-h-0 flex-col overflow-hidden border-muted-foreground/20">
            <CardHeader className="space-y-4">
              <CardTitle className="text-base">DocuMind Architecture</CardTitle>
              <CardDescription className="text-xs">
                Lead Architect: Artem Moshnin
              </CardDescription>
              <div className="space-y-2">
                <Button asChild variant="default" size="sm" className="w-full">
                  <Link href="/demo">
                    <ArrowLeft className="size-4" />
                    Return to Dashboard
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <Separator />
            <ScrollArea className="min-h-0 flex-1">
              <nav className="space-y-2 p-3">
                <a
                  href="#executive-summary"
                  className="block rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium leading-snug text-foreground transition-colors hover:bg-primary/10"
                >
                  Executive Summary
                </a>
                {chapters.map((chapter, chapterIndex) => (
                  <a
                    key={chapter.id}
                    href={`#${chapter.id}`}
                    className="block rounded-md border border-transparent px-3 py-2 transition-colors hover:border-border hover:bg-muted/50"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Chapter {chapterIndex + 1}
                    </p>
                    <p className="mt-0.5 break-words text-sm font-medium leading-snug">
                      {chapter.title}
                    </p>
                    <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
                      {chapter.subtitle}
                    </p>
                  </a>
                ))}
              </nav>
            </ScrollArea>
          </Card>
        </aside>

        <section className="space-y-8 pb-6">
          <div className="sticky top-3 z-20 xl:hidden">
            <Card className="border-primary/20 bg-card/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-card/85">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  asChild
                  variant="default"
                  className="w-full justify-center"
                >
                  <Link href="/demo">
                    <ArrowLeft className="size-4" />
                    Return to Dashboard
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-center"
                >
                  <a href="#executive-summary">Executive Summary</a>
                </Button>
              </div>
            </Card>
          </div>

          <Card
            id="executive-summary"
            className="scroll-mt-24 border-primary/20 shadow-sm"
          >
            <CardHeader>
              <CardTitle className="text-2xl">
                DocuMind Architecture Mini-Book
              </CardTitle>
              <CardDescription>
                Authored by Artem Moshnin, Lead Architect and Engineer. This
                guide documents the technical blueprint for a vendor-agnostic
                RAG system built for enterprise reliability and speed.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="space-y-6 pt-6">
              <p className="max-w-4xl text-[15px] leading-7 text-muted-foreground">
                DocuMind is implemented as a highly decoupled RAG platform.
                Retrieval, embeddings, generation routing, security boundaries,
                and recovery logic are separated intentionally so the platform
                can evolve across model vendors without replatforming.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {architecturePrinciples.map((principle, index) => (
                  <div
                    key={`${principle}-${index}`}
                    className="rounded-lg border bg-muted/20 px-4 py-3 text-sm leading-relaxed"
                  >
                    {principle}
                  </div>
                ))}
              </div>
              <div className="grid gap-4 xl:grid-cols-3">
                {executiveWhatWeBuiltSections.map((section) => (
                  <Card
                    key={section.title}
                    className="flex h-full flex-col border-muted-foreground/20 bg-muted/20 shadow-none"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        {section.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm leading-7 text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Summary:
                        </span>{" "}
                        {section.summary}
                      </p>
                      <p className="text-sm leading-7 text-muted-foreground">
                        <span className="font-medium text-foreground">
                          What Was Built:
                        </span>{" "}
                        {section.whatBuilt}
                      </p>
                      <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                        {section.complexity.map((point, pointIndex) => (
                          <li key={`${section.title}-${pointIndex}`}>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {chapters.map((chapter, chapterIndex) => {
            const Icon = chapter.icon

            return (
              <Card
                key={chapter.id}
                id={chapter.id}
                className="scroll-mt-24 border-muted-foreground/20 shadow-sm"
              >
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-md border bg-muted/30 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Chapter {chapterIndex + 1}
                    </span>
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon className="size-5 shrink-0 text-primary" />
                      <CardTitle className="min-w-0 text-xl leading-tight md:text-2xl">
                        {chapter.title}
                      </CardTitle>
                    </div>
                  </div>
                  <CardDescription className="text-sm leading-relaxed">
                    {chapter.subtitle}
                  </CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="space-y-5 pt-6">
                  {chapter.sections.map((section, sectionIndex) => (
                    <section
                      key={`${chapter.id}-section-${sectionIndex}`}
                      className="space-y-4 rounded-lg border bg-muted/15 p-5 md:p-6"
                    >
                      <h3 className="text-base font-semibold tracking-tight">
                        {section.heading}
                      </h3>
                      {section.paragraphs.map((paragraph, paragraphIndex) => (
                        <p
                          key={`${chapter.id}-${sectionIndex}-paragraph-${paragraphIndex}`}
                          className="w-full text-[15px] leading-7 text-muted-foreground"
                        >
                          {paragraph}
                        </p>
                      ))}
                      {section.alert ? (
                        <Card className="border-primary/30 bg-primary/5 shadow-none">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">
                              {section.alert.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="w-full text-sm leading-7 text-muted-foreground">
                              {section.alert.body}
                            </p>
                          </CardContent>
                        </Card>
                      ) : null}
                      {section.bullets ? (
                        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                          {section.bullets.map((bullet, bulletIndex) => (
                            <li
                              key={`${chapter.id}-${sectionIndex}-bullet-${bulletIndex}`}
                            >
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {section.table ? (
                        <div className="overflow-x-auto rounded-md border bg-card">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-muted/40">
                              <tr>
                                {section.table.columns.map(
                                  (column, columnIndex) => (
                                    <th
                                      key={`${chapter.id}-${sectionIndex}-col-${columnIndex}`}
                                      className="px-3 py-2 font-semibold"
                                    >
                                      {column}
                                    </th>
                                  ),
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {section.table.rows.map((row, rowIndex) => (
                                <tr
                                  key={`${chapter.id}-${sectionIndex}-row-${rowIndex}`}
                                  className="border-t odd:bg-background even:bg-muted/10"
                                >
                                  {row.map((cell, cellIndex) => (
                                    <td
                                      key={`${chapter.id}-${sectionIndex}-${rowIndex}-${cellIndex}`}
                                      className="px-3 py-2 align-top leading-relaxed text-muted-foreground"
                                    >
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </section>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </section>
      </div>
    </div>
  )
}
