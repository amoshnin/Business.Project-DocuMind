import Link from "next/link";
import { ArrowLeft, BookOpenText, GitBranch, LockKeyhole, Rocket, Search } from "lucide-react";
import { type ComponentType } from "react";

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

type Chapter = {
  id: string;
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  sections: {
    heading: string;
    paragraphs: string[];
    bullets?: string[];
    code?: string;
  }[];
};

const chapters: Chapter[] = [
  {
    id: "hybrid-retrieval-logic",
    title: "Chapter 1: Hybrid Retrieval Logic",
    subtitle: "Why DocuMind combines lexical precision and semantic recall",
    icon: Search,
    sections: [
      {
        heading: "1.1 Problem Statement and Design Objective",
        paragraphs: [
          "Pure semantic retrieval is excellent at understanding paraphrases, but it can miss legally critical surface forms such as clause numbers, exact product names, or rare acronyms. Pure lexical retrieval has the inverse failure mode: strong exact-match behavior, but poor conceptual coverage when user phrasing drifts.",
          "DocuMind deliberately uses a hybrid retriever so both failure modes are bounded. The code builds an `EnsembleRetriever` over two rankers: a Chroma dense retriever (`k=3`) and a BM25 retriever (`k=3`). Both are fused with equal weights (`0.5`, `0.5`) in `backend/services/retriever.py`.",
        ],
      },
      {
        heading: "1.2 Why BM25 + Vector Search Is the Right Pair",
        paragraphs: [
          "The vector branch handles semantic intent: if the user asks for 'liability carve-outs', it can still find chunks containing synonymous language such as 'exceptions to indemnification obligations'.",
          "The BM25 branch handles lexical anchor points: section labels, exact term strings, and enumerated obligations where precise token overlap correlates strongly with correctness.",
          "In enterprise document QA, both are required. The practical win is not average-case quality alone, but reduction of catastrophic misses on compliance-critical terms.",
        ],
        bullets: [
          "Dense branch source: Chroma vector store persisted on disk (`persist_directory`), queried with `k=3`.",
          "Lexical branch source: in-memory `_bm25_documents`, rebuilt from persisted Chroma documents on service startup.",
          "Fusion strategy: equal weighting to avoid overfitting early assumptions about corpus type.",
        ],
      },
      {
        heading: "1.3 Reciprocal Rank Fusion (RRF) Mechanics",
        paragraphs: [
          "LangChain's ensemble implementation applies weighted reciprocal-rank fusion. Conceptually, every retriever contributes a score based on position, not raw similarity magnitude, which makes rank scales comparable across heterogeneous retrievers.",
          "DocuMind uses equal branch weights. This is a decision for robustness: lexical and semantic signals are treated as peers until production telemetry justifies a tilt.",
        ],
        code: [
          "For each candidate document d:",
          "score(d) = Σ_i  w_i / (rank_i(d) + c)",
          "",
          "Where:",
          "- i is each retriever branch (dense, BM25)",
          "- w_i is branch weight (0.5, 0.5 in current code)",
          "- rank_i(d) is 1-based rank in branch i",
          "- c is a smoothing constant from the ensemble implementation",
        ].join("\n"),
      },
      {
        heading: "1.4 Trade-Offs and Why They Were Accepted",
        paragraphs: [
          "BM25 state is currently process-local (`_bm25_documents`), which is fast but not horizontally partition-aware. The initialization path (`initialize_retriever_from_disk`) compensates by reconstructing BM25 corpus from persisted Chroma docs at startup.",
          "This is an intentional phase-appropriate decision: optimize for deterministic behavior and straightforward observability first, then evolve toward distributed retrieval state once traffic and multi-tenant isolation pressure justify additional complexity.",
        ],
      },
    ],
  },
  {
    id: "pdf-parsing-context-stuffing",
    title: "Chapter 2: PDF Parsing & Context Stuffing",
    subtitle: "From raw pages to citation-ready answer context",
    icon: BookOpenText,
    sections: [
      {
        heading: "2.1 Extraction Pipeline",
        paragraphs: [
          "The PDF pipeline in `backend/services/document_processor.py` is intentionally explicit. PyMuPDF (`fitz`) extracts page text per page; empty pages are skipped; each page becomes a LangChain `Document` with `source` (filename) and `page` metadata.",
          "This preserves provenance early, before chunking, so downstream retrieval and citation generation never lose page-level traceability.",
        ],
      },
      {
        heading: "2.2 Chunking Strategy: Why 1000 / 150",
        paragraphs: [
          "Chunking uses `RecursiveCharacterTextSplitter` with a configurable `chunk_size` (`CHUNK_SIZE`, default `1000`) and fixed overlap `150`. This is a deliberate compromise between retrieval granularity and semantic continuity.",
          "Smaller chunks improve precision but can fragment clauses; larger chunks preserve coherence but dilute retrieval specificity. The chosen overlap reduces boundary loss for cross-sentence legal/compliance statements.",
        ],
        bullets: [
          "Chunk metadata is normalized: `source` preserved, `chunk_id` assigned as UUID.",
          "Chunk IDs are reused as vector-store IDs where available, improving traceability across indexing and retrieval.",
          "All heavy extraction/chunking paths are dispatched via `asyncio.to_thread` to avoid blocking the FastAPI event loop.",
        ],
      },
      {
        heading: "2.3 Context Stuffing and the 'Perfect Memory' Claim",
        paragraphs: [
          "Before generation, retrieved chunks are serialized into an explicit context block (`_format_context` in `llm_chain.py`) that includes chunk index, `document_id` fallback, filename, page number, and raw chunk text.",
          "This is the core of context stuffing: the model is fed the exact evidence payload in prompt space. Practically, this gives the model near-perfect short-term memory of retrieved evidence, even though the model itself has no persistent long-term memory of uploaded documents.",
          "The 'perfect memory' statement is therefore bounded: memory is perfect over the retrieved window, not the full corpus. Retrieval quality remains the gatekeeper.",
        ],
      },
      {
        heading: "2.4 Citation Integrity Controls",
        paragraphs: [
          "The prompting contract requires citations to match context metadata exactly and `source_text` to be verbatim. In streaming mode, the model emits answer tokens first, then a single `CitationTool` call.",
          "Tool-call argument chunks are incrementally accumulated and parsed (`_accumulate_tool_call_args` + `_parse_citations_from_buffers`), giving deterministic post-processing and a typed `ChatResponse` payload.",
        ],
      },
    ],
  },
  {
    id: "stateless-security-model",
    title: "Chapter 3: Stateless Security Model",
    subtitle: "BYOK flow from browser storage to per-request OpenAI clients",
    icon: LockKeyhole,
    sections: [
      {
        heading: "3.1 End-to-End Key Lifecycle",
        paragraphs: [
          "DocuMind uses a Bring Your Own Key model. The key is entered in the frontend settings modal and persisted locally under `DOCUMIND_USER_KEY` in browser storage.",
          "Every outbound request goes through `apiFetch` (`frontend/src/lib/api-client.ts`), which injects `X-OpenAI-Key` into request headers. The backend reads this via FastAPI dependency injection (`get_openai_key`, header alias `X-OpenAI-Key`).",
          "The key is validated (`sk-` prefix gate), then used to instantiate `OpenAIEmbeddings` and `ChatOpenAI` for that request scope. There is no server-side key database write in this path.",
        ],
      },
      {
        heading: "3.2 401 Recovery and Operator UX",
        paragraphs: [
          "If any request returns `401`, frontend interceptor logic clears local storage immediately and emits a client event (`documind:auth-error`). The shell listens and auto-opens the settings modal with an actionable error message.",
          "This closes the feedback loop without requiring page reloads or hidden failure states, reducing support burden and improving trust in key handling.",
        ],
      },
      {
        heading: "3.3 Why This Beats Server-Side `.env` for Multi-User Productization",
        paragraphs: [
          "Server-side `.env` keys are operationally convenient but become a liability in shared enterprise products: key blast radius is broad, per-tenant attribution is weak, and legal/security review is harder.",
          "BYOK shifts ownership and quota control to the user or tenant. It also removes the need for DocuMind to store customer model secrets in backend databases.",
        ],
        bullets: [
          "Blast radius reduction: compromise of one client key does not expose a platform master key.",
          "Clear tenant boundaries: each request is cryptographically attributable to one user-provided key.",
          "Compliance posture: simpler data-processing narrative because secret custody is minimized.",
        ],
      },
      {
        heading: "3.4 Transparent Trade-Offs",
        paragraphs: [
          "In local development, transport may run over `http://localhost`; in production, this design assumes TLS (`https`) termination to protect header confidentiality in transit.",
          "Client-side key storage means browser compromise risk must be acknowledged. The architecture deliberately chooses this risk in exchange for not centralizing secrets on the server.",
        ],
      },
    ],
  },
  {
    id: "tech-stack-choice",
    title: "Chapter 4: Tech Stack Choice",
    subtitle: "Why FastAPI + Next.js is the right systems pair",
    icon: Rocket,
    sections: [
      {
        heading: "4.1 FastAPI over Flask",
        paragraphs: [
          "This backend is concurrency-sensitive: PDF parsing, embedding calls, retrieval, and stream fan-out all benefit from asynchronous control flow with selective thread offloading.",
          "FastAPI gives native async ergonomics, typed dependencies, and tight Pydantic model integration. In this codebase, `ChatRequest`, `ChatResponse`, and nested citation metadata are validated automatically at boundaries.",
          "Flask can implement similar behavior, but requires more manual conventions for type contracts and async orchestration. FastAPI lowers incidental complexity for a retrieval-heavy API.",
        ],
      },
      {
        heading: "4.2 Next.js App Router over plain React SPA",
        paragraphs: [
          "The frontend requires both interactive client components (streaming chat, drag-drop uploads, modal orchestration) and route-level structured content (architecture pages, enterprise docs). App Router supports both cleanly.",
          "Compared to a standard React SPA, Next.js provides better route conventions, server rendering options, and easier future evolution toward pre-rendered recruiter-facing pages without re-architecting the app shell.",
        ],
      },
      {
        heading: "4.3 Runtime Division of Responsibilities",
        bullets: [
          "Backend owns truth: ingestion, retrieval, prompt structuring, citation validation, and stream event contract.",
          "Frontend owns interaction: streaming token assembly, citation interactivity, theme, and key lifecycle UX.",
          "API contract is explicit: token events + final payload + `[DONE]` terminator for deterministic stream completion.",
        ],
        paragraphs: [
          "This separation allows each side to be optimized independently. Backend changes to ranking or prompting can ship without redesigning client composition logic, while frontend UX can evolve without retraining model behavior.",
        ],
      },
    ],
  },
  {
    id: "engineering-challenges",
    title: "Chapter 5: Engineering Challenges Overcome",
    subtitle: "Execution notes from Lead Architect Artem Moshnin",
    icon: GitBranch,
    sections: [
      {
        heading: "5.1 Hallucination Risk Management",
        paragraphs: [
          "Hallucinations were addressed structurally, not cosmetically. Prompts force context-only reasoning, exact metadata matching, verbatim `source_text`, and an explicit 'insufficient context' branch with empty citations.",
          "Streaming is architected so textual answer generation and citation extraction remain linked in one pipeline (`stream_answer_events`), reducing mismatches between narrative answer and evidence payload.",
        ],
      },
      {
        heading: "5.2 Large PDF Throughput and Stability",
        paragraphs: [
          "Parsing and chunking are CPU-bound and potentially expensive for large files. The service avoids event-loop starvation by pushing extraction and splitting to worker threads via `asyncio.to_thread`.",
          "Storage is persistent (Chroma on disk), so restart behavior does not discard corpus state. On startup, BM25 corpus is rebuilt from persisted vectors, reducing warm-up friction.",
        ],
        bullets: [
          "Empty-page filtering avoids noise inflation.",
          "Chunk IDs enforce deterministic traceability from retrieval back to source snippets.",
          "Upload and query failure paths return explicit HTTP status + actionable UI recovery.",
        ],
      },
      {
        heading: "5.3 Retrieval Latency Optimization",
        paragraphs: [
          "Latency optimization was treated as a chain, not a single knob: retriever branch depth is bounded (`k=3` each), fusion keeps recall strong, and answer tokens stream immediately while citations are assembled in parallel tool-call parsing state.",
          "Query reformulation runs only when conversation history exists, reducing unnecessary LLM hops for first-turn queries. This balances contextual continuity with predictable response time.",
        ],
      },
      {
        heading: "5.4 Known Gaps and Forward Path",
        paragraphs: [
          "A senior architecture review should always include open risks. Session history is currently in-process memory (`session_store`), which is simple but not horizontally scalable. BM25 state is global and not tenant-isolated.",
          "The next stage is straightforward: externalize session and lexical state (for example Redis-backed stores), add per-tenant corpus partitioning, and instrument retrieval quality/latency telemetry to tune hybrid weights empirically.",
        ],
      },
    ],
  },
];

const architecturePrinciples = [
  "Ground every answer in retrievable evidence.",
  "Prefer explicit contracts over hidden coupling.",
  "Treat security as a first-class product feature.",
  "Optimize for explainability before raw throughput.",
];

const executiveWhatWeBuiltSections = [
  {
    title: "The 'Power Grid' Analogy",
    summary:
      "OpenAI is the power plant. DocuMind is the electrical grid, transformer stations, and smart-home wiring that turn raw intelligence into dependable business utility.",
    whatBuilt:
      "Artem Moshnin architected the orchestration layer that prepares private PDFs, routes the right evidence into each answer, and returns outputs with audit-ready citations.",
    complexity: [
      "OpenAI does not natively ingest, index, and search your private 100-page documents as a reusable knowledge system.",
      "DocuMind handles the full utility infrastructure: ingestion, indexing, retrieval fusion, grounding rules, and citation UX.",
      "Result: the model becomes operationally useful, not just generally intelligent.",
    ],
  },
  {
    title: "1) Retrieval Intelligence (The Library vs. The Book)",
    summary:
      "A base model may be brilliant, but it has not read your exact PDF in an optimized way for each question.",
    whatBuilt:
      "DocuMind implements a Hybrid Ensemble Retriever: it chunks documents, stores them in a vector store, runs BM25 keyword retrieval and semantic retrieval, then fuses rankings with RRF to return the highest-value evidence slices.",
    complexity: [
      "This is the difference between searching 10,000 paragraphs blindly vs. finding the three paragraphs that actually answer the question.",
      "Keyword retrieval protects exact legal and policy terms; semantic retrieval captures conceptual phrasing and paraphrases.",
      "RRF gives stable merged ranking instead of brittle single-retriever behavior.",
    ],
  },
  {
    title: "2) Data Pipeline (ETL for Documents)",
    summary:
      "OpenAI understands text tokens, not raw PDF structure. Enterprise documents must be transformed before they can be queried reliably.",
    whatBuilt:
      "DocuMind ships an ETL pipeline: PDF extraction, text normalization, recursive splitting, metadata enrichment, and chunk persistence for repeatable retrieval.",
    complexity: [
      "Chunk size and overlap are product decisions, not defaults; they control answer coherence vs. precision.",
      "Overlap preserves meaning across boundaries so clauses do not break mid-thought.",
      "This pipeline is what turns 'file upload' into production-grade knowledge preparation.",
    ],
  },
  {
    title: "3) Stateful UX + Stateless Security",
    summary:
      "OpenAI offers an API endpoint. It does not provide the end-user platform behavior enterprises require.",
    whatBuilt:
      "DocuMind provides a BYOK security model with sessioned chat experience: the key is controlled by the user, injected per request, and never persisted in DocuMind databases.",
    complexity: [
      "Key flow is explicit: browser local storage -> encrypted request header -> FastAPI dependency validation -> volatile runtime usage.",
      "On `401`, the key is auto-cleared and the settings modal is reopened, preventing silent auth drift.",
      "Users get continuous multi-turn conversation while security remains stateless at the credential layer.",
    ],
  },
  {
    title: "4) Prompt Engineering + Context Stuffing",
    summary:
      "Passing raw text to a model is not enough. The model needs structured, prioritized context and strict behavioral constraints.",
    whatBuilt:
      "DocuMind orchestrates prompt contracts that force document-grounded answers with citation requirements, while stuffing only top-retrieved chunks into the context window.",
    complexity: [
      "This prevents 'confident guessing' by making evidence attachment a first-class output requirement.",
      "Context window budget is managed deliberately so the model focuses on highest-signal chunks.",
      "Streaming answer generation is paired with structured citation finalization for trust and speed.",
    ],
  },
  {
    title: "Business ROI and Product Outcome",
    summary:
      "DocuMind converts raw model capability into measurable business outcomes, not just impressive demos.",
    whatBuilt:
      "Artem Moshnin designed DocuMind as a product architecture: security posture, retrieval precision, explainability, and operator UX aligned to enterprise decision workflows.",
    complexity: [
      "Typical impact target: up to 90% reduction in manual review time for long-form technical/legal documents.",
      "Citation grounding materially lowers hallucination risk on critical business decisions.",
      "BYOK gives cost control and procurement-friendly ownership of model spend.",
    ],
  },
];

export default function ArchitecturePage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 p-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:p-6">
        <aside className="lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)]">
          <Card className="h-full min-h-0 overflow-hidden">
            <CardHeader className="gap-2">
              <CardTitle className="text-base">DocuMind Architecture</CardTitle>
              <CardDescription className="text-xs">
                Lead Architect: Artem Moshnin
              </CardDescription>
              <Button asChild variant="default" size="sm" className="mt-1">
                <Link href="/">
                  <ArrowLeft className="size-4" />
                  Return to Dashboard
                </Link>
              </Button>
            </CardHeader>
            <Separator />
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-1 p-3">
                <Button asChild variant="ghost" className="w-full justify-start">
                  <a href="#executive-summary">Executive Summary</a>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="h-auto w-full justify-start whitespace-normal break-words py-2 text-left leading-snug"
                >
                  <a href="#executive-summary-what-we-built">
                    The Executive Summary: What We Actually Built.
                  </a>
                </Button>
                {chapters.map((chapter) => (
                  <Button
                    key={chapter.id}
                    asChild
                    variant="ghost"
                    className="h-auto w-full justify-start whitespace-normal break-words py-2 text-left leading-snug"
                  >
                    <a href={`#${chapter.id}`}>{chapter.title}</a>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </aside>

        <div className="space-y-6">
          <div className="sticky top-3 z-20 lg:hidden">
            <Card className="border-primary/20 bg-card/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-card/85">
              <Button asChild variant="default" className="w-full justify-center">
                <Link href="/">
                  <ArrowLeft className="size-4" />
                  Return to Dashboard
                </Link>
              </Button>
            </Card>
          </div>

          <Card id="executive-summary" className="scroll-mt-24">
            <CardHeader>
              <CardTitle className="text-2xl">
                DocuMind Architecture Mini-Book
              </CardTitle>
              <CardDescription>
                A technical deep-dive for engineering leadership and recruiter
                review.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm leading-7 text-muted-foreground">
                This document describes not only what was implemented across the
                FastAPI backend and Next.js frontend, but why each architectural
                decision was made, what trade-offs were accepted, and where the
                system should evolve next.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {architecturePrinciples.map((principle, principleIndex) => (
                  <div
                    key={`${principle}-${principleIndex}`}
                    className="rounded-md border bg-muted/30 px-3 py-2 text-sm"
                  >
                    {principle}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card
            id="executive-summary-what-we-built"
            className="scroll-mt-24 border-primary/20"
          >
            <CardHeader>
              <CardTitle className="text-2xl">
                The Executive Summary: What We Actually Built.
              </CardTitle>
              <CardDescription>
                Product framing for technical recruiters, leadership, and
                business stakeholders.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm leading-7 text-muted-foreground">
                DocuMind is the operational layer that turns raw model
                intelligence into enterprise-grade decision support. It answers
                the core business question directly: if OpenAI is the model,
                DocuMind is the product system that makes that model useful,
                auditable, secure, and ROI-positive in real document workflows.
              </p>
              <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm leading-7 text-muted-foreground">
                Without this architecture, sending a 50-page PDF directly to a
                model is often fragile, costly, and hard to trust. DocuMind
                exists to solve that operational gap.
              </p>
              <div className="grid gap-4">
                {executiveWhatWeBuiltSections.map((section) => (
                  <Card
                    key={section.title}
                    className="border-muted-foreground/20 bg-muted/20 shadow-none"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm leading-7 text-muted-foreground">
                        {section.summary}
                      </p>
                      <p className="text-sm leading-7 text-muted-foreground">
                        {section.whatBuilt}
                      </p>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {section.complexity.map((point, pointIndex) => (
                          <li key={`${section.title}-complexity-${pointIndex}`}>
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

          {chapters.map((chapter) => {
            const Icon = chapter.icon;

            return (
              <Card key={chapter.id} id={chapter.id} className="scroll-mt-24">
                <CardHeader className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="size-5 text-primary" />
                    <CardTitle className="text-xl">{chapter.title}</CardTitle>
                  </div>
                  <CardDescription>{chapter.subtitle}</CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="space-y-8 pt-6">
                  {chapter.sections.map((section) => (
                    <section key={section.heading} className="space-y-3">
                      <h3 className="text-base font-semibold tracking-tight">
                        {section.heading}
                      </h3>
                      {section.paragraphs.map((paragraph, paragraphIndex) => (
                        <p
                          key={`${section.heading}-paragraph-${paragraphIndex}`}
                          className="text-sm leading-7 text-muted-foreground"
                        >
                          {paragraph}
                        </p>
                      ))}
                      {section.bullets ? (
                        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {section.bullets.map((bullet, bulletIndex) => (
                            <li key={`${section.heading}-bullet-${bulletIndex}`}>
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {section.code ? (
                        <pre className="overflow-x-auto rounded-md border bg-muted/20 p-3 font-mono text-xs leading-6">
                          {section.code}
                        </pre>
                      ) : null}
                    </section>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
