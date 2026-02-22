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
    subtitle: "I explain every request path from UI to model and back",
    icon: Search,
    sections: [
      {
        heading: "1.1 I start with a strict ingestion entrypoint",
        paragraphs: [
          "I accept PDF uploads through `/api/v1/documents/upload`, and I validate provider context before I process any file bytes.",
          "I require `X-Model-Provider` on every call, and I enforce provider-specific constraints through FastAPI dependencies so invalid auth states fail early.",
          "I reject empty payloads and missing filenames immediately, and I keep failure semantics explicit with typed HTTP status codes.",
        ],
        bullets: [
          "I validate provider selection in `get_model_provider` before endpoint logic runs.",
          "I validate OpenAI key format in `get_provider_context` before I allow OpenAI requests.",
          "I keep Groq server key checks centralized so runtime misconfiguration fails predictably.",
        ],
      },
      {
        heading: "1.2 I execute the conversational path as a streaming pipeline",
        paragraphs: [
          "I handle chat queries through `/api/v1/chat/stream`, and I require a stable `session_id` plus `query` in the request body.",
          "I optionally reformulate follow-up questions against prior chat history, and I run retrieval before I start token generation.",
          "I stream events as SSE packets so users see real-time token output and do not wait for full completion.",
        ],
        bullets: [
          "I emit `token` events for incremental answer text.",
          "I emit a final `final` event with full answer and citation payload.",
          "I terminate streams with `[DONE]` so the client state machine closes cleanly.",
        ],
      },
      {
        heading: "1.3 I close each stream with deterministic state updates",
        paragraphs: [
          "I preserve the final assistant answer string on the backend while streaming, and I append the final user and assistant turns to `session_store` after completion.",
          "I keep this order intentional because I want reformulation on the next turn to use stable finalized content instead of partial token buffers.",
          "I treat this stream lifecycle as a contract between backend orchestration and frontend rendering, and I avoid hidden side effects outside that contract.",
        ],
      },
    ],
  },
  {
    id: "hybrid-retrieval-logic",
    title: "Chapter 2: Hybrid Retrieval Logic",
    subtitle: "I combine lexical and semantic search with rank fusion",
    icon: Search,
    sections: [
      {
        heading: "2.1 I split retrieval responsibilities by failure mode",
        paragraphs: [
          "I use BM25 to catch strict lexical anchors such as exact clauses, IDs, and policy terms that dense search can miss.",
          "I use dense vector retrieval to capture conceptual similarity when user phrasing differs from source wording.",
          "I combine both because enterprise documents fail in both directions, and I want high recall without sacrificing precision.",
        ],
      },
      {
        heading: "2.2 I merge candidate lists with Reciprocal Rank Fusion",
        paragraphs: [
          "I avoid direct score mixing because BM25 and dense scores live on different numeric scales and drift under corpus changes.",
          "I use `EnsembleRetriever` with balanced weights so ranking is position-aware rather than raw-score fragile.",
          "I treat this as a production safety choice because rank fusion stays stable when models, corpora, or tokenization behaviors evolve.",
        ],
        bullets: [
          "I run dense retrieval at `k=3` from Chroma for fast semantic candidates.",
          "I run BM25 retrieval at `k=3` from in-memory documents for lexical precision.",
          "I fuse results with weights `[0.5, 0.5]` to keep behavior balanced and interpretable.",
        ],
      },
      {
        heading: "2.3 I recover lexical memory after restarts",
        paragraphs: [
          "I persist vectors on disk in Chroma and I rebuild BM25 documents from persisted records during app lifespan startup.",
          "I do this because BM25 is memory-resident in this design, and I need retrieval continuity without forcing immediate re-upload after reboot.",
          "I treat startup hydration as mandatory infrastructure because hybrid retrieval is only reliable when both branches are warm.",
        ],
      },
    ],
  },
  {
    id: "pdf-parsing-context-stuffing",
    title: "Chapter 3: PDF ETL and Chunk Engineering",
    subtitle: "I convert raw PDFs into deterministic retrieval memory",
    icon: BookOpenText,
    sections: [
      {
        heading: "3.1 I extract page text with explicit metadata",
        paragraphs: [
          "I parse PDFs with PyMuPDF (`fitz`) and I iterate page-by-page so every extracted block stays tied to page boundaries.",
          "I skip empty pages and I normalize metadata fields such as `source` and `page` so downstream retrieval logic can rely on consistent structure.",
          "I convert each extracted page into LangChain `Document` objects so every next stage operates on typed units instead of loose strings.",
        ],
      },
      {
        heading: "3.2 I tune recursive chunking as a quality control system",
        paragraphs: [
          "I split with `RecursiveCharacterTextSplitter` using configurable `CHUNK_SIZE` and fixed overlap `150`, and I use this as the main quality lever for answer coherence.",
          "I pick overlap to preserve clause continuity across chunk boundaries, and I reduce edge-loss for legal, financial, and specification-heavy documents.",
          "I keep chunking deterministic because retrieval quality and citation trust collapse quickly when chunk topology is unstable.",
        ],
      },
      {
        heading: "3.3 I load chunks into persistent and queryable storage",
        paragraphs: [
          "I assign every chunk a durable `chunk_id` and I upsert chunks into Chroma with explicit IDs so repeated ingestion stays consistent.",
          "I persist vectors to disk when available and I keep storage directory configurable via `CHROMA_PERSIST_DIR`.",
          "I maintain the same chunk documents in BM25 memory so lexical and semantic branches operate on aligned evidence units.",
        ],
      },
      {
        heading: "3.4 I render context for the model as structured evidence",
        paragraphs: [
          "I format retrieved chunks into numbered context blocks that include `document_id`, `filename`, and `page_number` before generation.",
          "I make metadata explicit in prompt context because citation tool output must exactly mirror those values.",
          "I use this format as the bridge between retrieval truth and generation behavior, and I treat it as the anti-hallucination backbone.",
        ],
      },
    ],
  },
  {
    id: "llm-router-pattern",
    title: "Chapter 4: Prompt and Generation Orchestration",
    subtitle: "I enforce grounded answers through strict prompt contracts",
    icon: Shuffle,
    sections: [
      {
        heading: "4.1 I separate retrieval intent from answer intent",
        paragraphs: [
          "I reformulate multi-turn user input into a standalone retrieval query when history exists, and I keep this step independent from final answer wording.",
          "I retrieve with the reformulated query and I generate with the original user question plus chat history so retrieval precision and conversational UX stay aligned.",
          "I split these concerns deliberately because retrieval optimization and answer style optimization are different engineering problems.",
        ],
      },
      {
        heading: "4.2 I enforce citation integrity with structured outputs",
        paragraphs: [
          "I define strict system prompts that prohibit outside knowledge and I require citation metadata to match retrieved context exactly.",
          "I use typed Pydantic response models for non-streaming answers and I validate citations against schema before I return responses.",
          "I force `source_text` to remain verbatim so users can audit claims directly against the uploaded document.",
        ],
      },
      {
        heading: "4.3 I stream text and citations in a single model pass",
        paragraphs: [
          "I bind a `CitationTool` during streaming generation and I accumulate both text tokens and tool-call argument fragments concurrently.",
          "I parse tool-call JSON buffers at stream completion and I emit a final event that carries fully typed citations.",
          "I use one-pass streaming because I reduce latency and token spend while preserving structured provenance.",
        ],
        bullets: [
          "I append every token into the visible assistant message in real time.",
          "I parse tool-call chunks defensively so partial JSON does not break the stream.",
          "I finalize response payloads through `ChatResponse` serialization for deterministic client parsing.",
        ],
      },
      {
        heading: "4.4 I keep model behavior predictable under missing context",
        paragraphs: [
          "I instruct the model to state context insufficiency explicitly when evidence is missing, and I require empty citation arrays in that state.",
          "I prefer explicit uncertainty over speculative completion because enterprise trust is built on reliability instead of verbosity.",
          "I treat this rule as a product principle and not as an optional prompt tweak.",
        ],
      },
    ],
  },
  {
    id: "vendor-agnostic-router",
    title: "Chapter 5: Vendor-Agnostic LLM Router",
    subtitle: "I keep one product surface while I swap model backends",
    icon: Rocket,
    sections: [
      {
        heading: "5.1 I route providers through a hard API contract",
        paragraphs: [
          "I route providers through `X-Model-Provider` and I constrain allowed values to `groq` or `openai` at request boundaries.",
          "I reject unsupported providers with `400` early and I keep routing logic centralized in dependencies instead of scattering checks across handlers.",
          "I use this pattern so every endpoint shares the same control-plane behavior for provider selection.",
        ],
      },
      {
        heading: "5.2 I instantiate models through a factory boundary",
        paragraphs: [
          "I create OpenAI and Groq chat models through `get_llm` so endpoint code stays provider-neutral after dependency resolution.",
          "I set OpenAI to `gpt-4o-mini` and Groq to `llama3-8b-8192`, and I keep temperature deterministic at `0` for consistency.",
          "I isolate provider constructors because I want future provider additions to touch one module boundary instead of every endpoint.",
        ],
      },
      {
        heading: "5.3 I optimize onboarding and control as separate modes",
        paragraphs: [
          "I default to Groq for low-friction onboarding and low-latency first token experiences.",
          "I expose OpenAI as BYOK fallback so power users can attach their own account limits, policy controls, and budget ownership.",
          "I treat this dual-mode architecture as an anti-lock-in product strategy instead of a temporary compatibility layer.",
        ],
        table: {
          columns: ["Dimension", "Groq (Default)", "OpenAI (BYOK)"],
          rows: [
            [
              "Primary Advantage",
              "I deliver fast onboarding and very low latency.",
              "I deliver user-controlled quota and policy governance.",
            ],
            [
              "Operational Risk",
              "I can hit strict free-tier rate limits.",
              "I can fail on invalid user credentials.",
            ],
            [
              "UX Recovery Path",
              "I encourage retry or provider switch after `429`.",
              "I clear invalid keys and reopen settings after `401`.",
            ],
          ],
        },
      },
    ],
  },
  {
    id: "decoupled-embeddings",
    title: "Chapter 6: Decoupled Embeddings and Index Stability",
    subtitle: "I keep retrieval infrastructure independent from generation engines",
    icon: Rocket,
    sections: [
      {
        heading: "6.1 I pin indexing to a provider-independent embedding model",
        paragraphs: [
          "I run embeddings through `HuggingFaceEmbeddings` with `all-MiniLM-L6-v2` and I cache the embedding model instance with `lru_cache`.",
          "I decouple embeddings from generation so provider switching does not trigger re-indexing or schema churn.",
          "I treat embedding independence as a long-term platform decision because model providers will evolve faster than document memory formats.",
        ],
      },
      {
        heading: "6.2 I preserve retrieval behavior across provider switches",
        paragraphs: [
          "I keep the vector store and BM25 corpus stable while users toggle providers, and I preserve retrieval consistency across the same document set.",
          "I avoid expensive re-embedding loops during active sessions, and I keep response latency focused on retrieval plus generation only.",
          "I reduce both infrastructure cost and user friction because switching engines does not reset document intelligence.",
        ],
        bullets: [
          "I keep chunk identity stable with durable `chunk_id` values.",
          "I keep vector persistence durable through Chroma disk storage.",
          "I keep lexical and dense branches aligned on the same chunk corpus.",
        ],
      },
    ],
  },
  {
    id: "stateless-security-model",
    title: "Chapter 7: Stateless Security and BYOK",
    subtitle: "I move credential control to the user without storing secrets server-side",
    icon: LockKeyhole,
    sections: [
      {
        heading: "7.1 I keep API key ownership in the browser",
        paragraphs: [
          "I store user OpenAI keys in browser local storage only, and I never persist them in backend databases.",
          "I inject keys only when the selected provider is OpenAI, and I send them through `X-OpenAI-Key` on encrypted transport.",
          "I keep this model stateless on the server so credential compromise blast radius stays minimal.",
        ],
      },
      {
        heading: "7.2 I enforce auth recovery in the API client layer",
        paragraphs: [
          "I centralize request headers in `apiFetch` and I always attach `X-Model-Provider` for backend routing consistency.",
          "I trap `401` responses client-side and I clear local OpenAI keys immediately before I dispatch the settings recovery event.",
          "I reopen settings with explicit error messaging so users can recover without losing broader chat context.",
        ],
        bullets: [
          "I clear stale credentials automatically after unauthorized responses.",
          "I keep Groq mode key-free so onboarding does not block on secret setup.",
          "I separate provider preference state from key state to avoid accidental lockouts.",
        ],
      },
    ],
  },
  {
    id: "frontend-runtime-ux",
    title: "Chapter 8: Frontend Runtime and Interaction Design",
    subtitle: "I implement a streaming-first UI state machine for evidence-driven chat",
    icon: BookOpenText,
    sections: [
      {
        heading: "8.1 I gate user actions with explicit readiness checks",
        paragraphs: [
          "I block message sending until required prerequisites are ready, and I evaluate readiness from provider mode, API key state, and document upload state.",
          "I surface deterministic blocked reasons in the chat composer so users understand exactly why sending is disabled.",
          "I keep `New Session` hidden until the current session is used, and I avoid redundant controls when state is already blank.",
        ],
      },
      {
        heading: "8.2 I parse SSE manually for deterministic rendering control",
        paragraphs: [
          "I read the Fetch `ReadableStream` directly in the chat component and I decode incremental bytes with `TextDecoder`.",
          "I parse SSE blocks on `\\n\\n` boundaries and I support multiple `data:` lines per event for robust payload reconstruction.",
          "I append incoming token chunks into the active assistant message so users see low-latency typing behavior without polling.",
        ],
        bullets: [
          "I switch off the typing indicator when I receive first-byte token data.",
          "I finalize assistant messages when I receive the `final` event payload.",
          "I keep citations attached to the same completed assistant turn for traceability.",
        ],
      },
      {
        heading: "8.3 I synchronize citation interactions across panes",
        paragraphs: [
          "I lift `activeCitation` state to the dashboard page and I pass it into both chat and document panes.",
          "I render citation badges under assistant messages and I map each click to a full source chunk view on the right panel.",
          "I treat this split-pane interaction as evidence navigation, and I keep provenance visible at the exact point of user intent.",
        ],
      },
    ],
  },
  {
    id: "system-resilience",
    title: "Chapter 9: Resilience, Performance, and Operational Discipline",
    subtitle: "I harden failure paths while I keep latency and quality predictable",
    icon: LockKeyhole,
    sections: [
      {
        heading: "9.1 I map vendor-specific failures to actionable UX behavior",
        paragraphs: [
          "I treat provider-specific exceptions as first-class runtime states: Groq pressure as `429`, OpenAI auth issues as `401`.",
          "I pair backend semantics with frontend recovery so invalid OpenAI credentials clear and reopen settings while Groq limits preserve context and suggest retry or provider switch.",
          "I prefer explicit failure semantics because silent degradation destroys trust faster than visible controlled errors.",
        ],
      },
      {
        heading: "9.2 I optimize throughput with asynchronous boundaries",
        paragraphs: [
          "I offload CPU-heavy operations such as PDF extraction and retrieval storage tasks into `asyncio.to_thread` so API responsiveness stays high.",
          "I pre-read the first stream event before continuous yielding so immediate provider failures surface deterministically before long stream lifecycles.",
          "I cache settings and embedding models where safe so I avoid repeated initialization overhead in hot paths.",
        ],
        bullets: [
          "I use provider-aware fallback paths to reduce operational dead-ends.",
          "I maintain session continuity across model-provider switches and retries.",
          "I keep latency stable through chunked streaming and incremental rendering.",
        ],
      },
      {
        heading: "9.3 I maintain quality with repeatable evaluation loops",
        paragraphs: [
          "I run an evaluation script over a golden dataset and I score faithfulness plus answer relevance with structured judge outputs.",
          "I measure end-to-end behavior instead of isolated component metrics because retrieval and generation quality are tightly coupled in production.",
          "I use this evaluation loop as release discipline so architecture changes improve business outcomes and not only code elegance.",
        ],
      },
      {
        heading: "9.4 I frame the architecture as a durable product system",
        paragraphs: [
          "I design DocuMind to convert general LLM capability into reliable document intelligence throughput for real teams.",
          "I combine retrieval rigor, provider abstraction, stateless security, and streaming UX so the system remains trustworthy under enterprise load.",
          "I built this as a platform architecture and not as a single-model demo so I can evolve providers, prompts, and retrieval policies without replatforming.",
        ],
      },
    ],
  },
]

const architecturePrinciples = [
  "I ground every answer in retrievable evidence.",
  "I prefer explicit contracts over hidden coupling in every layer.",
  "I decouple retrieval, embeddings, and generation to keep runtime flexibility.",
  "I prevent lock-in through provider abstraction and stateless security boundaries.",
  "I optimize for explainability, resilience, and operational clarity.",
  "I treat UX state machines as part of system correctness and not visual polish.",
  "I measure quality through repeatable evaluation loops before I trust intuition.",
]

const executiveWhatWeBuiltSections = [
  {
    title: "Runtime Orchestration",
    summary:
      "I orchestrate ingestion, retrieval, reformulation, generation, and citation rendering as one deterministic runtime pipeline.",
    whatBuilt:
      "I implemented strict endpoint contracts, streaming SSE semantics, typed payloads, and cross-pane citation linking so every answer is traceable.",
    complexity: [
      "I synchronize backend stream events and frontend parser state machines.",
      "I persist chat history in session flow while I preserve low-latency rendering.",
      "I keep error semantics explicit so recovery paths remain deterministic.",
    ],
  },
  {
    title: "Retrieval Intelligence",
    summary:
      "I combine BM25 and dense retrieval with fusion because enterprise questions fail across lexical and semantic axes.",
    whatBuilt:
      "I implemented hybrid retrieval, RRF-style rank fusion, persistent vectors, and startup hydration of lexical memory.",
    complexity: [
      "I keep retrieval stable across restarts by rebuilding BM25 from disk-backed data.",
      "I tune chunk topology for both citation fidelity and answer coherence.",
      "I isolate embedding infrastructure from generation infrastructure.",
    ],
  },
  {
    title: "Vendor-Agnostic Security",
    summary:
      "I keep provider routing abstract while I keep user credential control local through BYOK.",
    whatBuilt:
      "I implemented provider headers, conditional key injection, automatic 401 key invalidation, and settings-driven remediation UX.",
    complexity: [
      "I keep server-side logic stateless with respect to user secrets.",
      "I keep provider failure handling explicit for both OpenAI and Groq paths.",
      "I keep operating modes flexible without creating divergent product surfaces.",
    ],
  },
  {
    title: "Operational Discipline",
    summary:
      "I maintain reliability through typed schemas, async boundaries, and quality evaluation loops.",
    whatBuilt:
      "I implemented explicit exception mapping, structured responses, stream-safe parsing, and judge-based regression scoring.",
    complexity: [
      "I prevent silent failures through typed payload and status contracts.",
      "I protect user momentum with graceful retry and recovery paths.",
      "I align engineering decisions with business throughput and trust.",
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
                  <Link href="/">
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
                  <Link href="/">
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
                I authored this mini-book as Artem Moshnin, Lead Architect and
                Engineer. I describe my technical blueprint for a
                vendor-agnostic RAG system built for enterprise reliability and
                speed.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="space-y-6 pt-6">
              <p className="max-w-4xl text-[15px] leading-7 text-muted-foreground">
                I built DocuMind as a highly decoupled RAG platform.
                I intentionally separate retrieval, embeddings, generation
                routing, security boundaries, and recovery logic so we can
                evolve across model vendors without replatforming.
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
                          What I built:
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
