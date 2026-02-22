import Link from "next/link";
import {
  ArrowLeft,
  BookOpenText,
  LockKeyhole,
  Rocket,
  Search,
  Shuffle,
} from "lucide-react";
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

type ChapterSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  alert?: {
    title: string;
    body: string;
  };
  table?: {
    columns: string[];
    rows: string[][];
  };
};

type Chapter = {
  id: string;
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  sections: ChapterSection[];
};

const chapters: Chapter[] = [
  {
    id: "hybrid-retrieval-logic",
    title: "Chapter 1: Hybrid Retrieval Logic",
    subtitle: "Why lexical + semantic retrieval remains the foundation",
    icon: Search,
    sections: [
      {
        heading: "1.1 Why Hybrid Retrieval Still Matters in a Vendor-Agnostic Stack",
        paragraphs: [
          "Vendor-agnostic generation does not remove the core retrieval problem: business users ask precise questions, and the system must fetch the right evidence from long documents quickly and reliably.",
          "DocuMind keeps a Hybrid Ensemble Retriever: BM25 for exact lexical anchors and dense vector retrieval for semantic similarity. This protects both precision and recall under real enterprise query variance.",
        ],
      },
      {
        heading: "1.2 Reciprocal Rank Fusion (RRF) as the Merge Strategy",
        paragraphs: [
          "Dense and lexical retrievers produce different ranking profiles. RRF combines them in a rank-stable way so one branch does not dominate due to score-scale differences.",
        ],
        bullets: [
          "Dense retriever (`k=3`) and BM25 retriever (`k=3`) are fused in the ensemble layer.",
          "Balanced weights keep behavior predictable while telemetry matures.",
          "Result: fewer catastrophic misses on exact terms without sacrificing conceptual matching.",
        ],
      },
    ],
  },
  {
    id: "pdf-parsing-context-stuffing",
    title: "Chapter 2: PDF Parsing & Context Stuffing",
    subtitle: "ETL discipline that makes model answers coherent and citable",
    icon: BookOpenText,
    sections: [
      {
        heading: "2.1 Document ETL Pipeline",
        paragraphs: [
          "DocuMind treats PDF ingestion as an ETL pipeline: extract page text, transform into chunk-ready documents with metadata, then load into retrieval storage.",
          "This removes the fragility of raw file prompting and creates deterministic, queryable memory for the assistant.",
        ],
      },
      {
        heading: "2.2 Chunk Strategy and Why It Is a Product Decision",
        paragraphs: [
          "Recursive splitting with tuned size and overlap is not a formatting detail; it is a quality-control lever. Too small fragments context, too large dilutes retrieval focus.",
          "Overlap preserves meaning at chunk boundaries, improving answer coherence for clause-heavy legal and technical documents.",
        ],
      },
      {
        heading: "2.3 Context Stuffing with Guardrails",
        paragraphs: [
          "Retrieved chunks are formatted with explicit metadata and inserted into prompt context as first-class evidence. Prompt contracts require answer grounding and structured citations.",
          "This architecture turns the model from a guessing engine into an evidence-driven responder.",
        ],
      },
    ],
  },
  {
    id: "llm-router-pattern",
    title: "Chapter 3: The LLM Router Pattern",
    subtitle: "The anti-lock-in core of the new DocuMind runtime",
    icon: Shuffle,
    sections: [
      {
        heading: "3.1 Provider Abstraction by Header Contract",
        paragraphs: [
          "DocuMind now routes generation by provider through `X-Model-Provider` (`groq` or `openai`), with backend routing handled by explicit dependency and factory logic.",
          "This is a conscious enterprise architecture decision by Lead Engineer Artem Moshnin: preserve runtime optionality and prevent vendor lock-in while keeping one stable product surface.",
        ],
      },
      {
        heading: "3.2 Why Groq + Llama 3 Is the Default",
        paragraphs: [
          "Defaulting to Groq (Llama 3) optimizes onboarding speed: ultra-low-latency inference, no user API key requirement, immediate first query experience.",
          "This default is product-led: remove setup friction first, then expose advanced provider controls only when needed.",
        ],
        alert: {
          title: "Default Runtime Policy",
          body: "Groq + Llama 3 is optimized for instant onboarding. OpenAI BYOK remains a first-class fallback for power users and enterprise governance.",
        },
      },
      {
        heading: "3.3 OpenAI BYOK Fallback",
        paragraphs: [
          "OpenAI mode uses BYOK. The user key is supplied only when `openai` is selected, allowing advanced users to bring their own quota, billing, and policy controls.",
          "This dual-mode architecture keeps one UX while supporting two operating models: free-tier speed path and enterprise-controlled spend path.",
        ],
      },
    ],
  },
  {
    id: "decoupled-embeddings",
    title: "Chapter 4: Decoupled Embeddings",
    subtitle: "Why provider switching does not force re-indexing",
    icon: Rocket,
    sections: [
      {
        heading: "4.1 Embeddings Are Provider-Independent Infrastructure",
        paragraphs: [
          "DocuMind uses `HuggingFaceEmbeddings` with `all-MiniLM-L6-v2` for vector indexing. This embedding layer is intentionally decoupled from generation providers.",
          "Generation can switch between Groq and OpenAI without changing embedding space or vector-store schema.",
        ],
      },
      {
        heading: "4.2 Mid-Conversation Provider Switching Without Reprocessing",
        paragraphs: [
          "Because indexing is tied to a stable embedding model, provider changes do not trigger PDF re-indexing. Users can switch engines mid-session and continue querying the same indexed corpus.",
          "This removes an expensive and disruptive failure mode common in tightly coupled RAG stacks.",
        ],
        bullets: [
          "No re-embedding churn when toggling providers.",
          "Consistent retrieval behavior across generation engines.",
          "Lower operational cost and better session continuity.",
        ],
      },
    ],
  },
  {
    id: "cost-performance-tradeoffs",
    title: "Chapter 5: Cost vs Performance Trade-Offs",
    subtitle: "Transparent provider economics for enterprise decision makers",
    icon: BookOpenText,
    sections: [
      {
        heading: "5.1 Practical Trade-Off Matrix",
        paragraphs: [
          "DocuMind exposes provider choice as an explicit operating lever. Teams can choose speed-first or quota/budget-first behavior without changing product workflows.",
        ],
        table: {
          columns: ["Dimension", "Groq (Llama 3 - Default)", "OpenAI (GPT-4o)"],
          rows: [
            [
              "Inference Speed",
              "Excellent latency profile (LPU-based runtime)",
              "Strong performance, typically less burst-optimized",
            ],
            [
              "Rate Limits",
              "Strict free-tier request limits",
              "Higher account-based limits for many workloads",
            ],
            [
              "Onboarding",
              "No API key needed for end user",
              "Requires BYOK setup",
            ],
            [
              "Cost Ownership",
              "Platform-side provider cost model",
              "User directly controls spend through key",
            ],
            [
              "Best Operational Fit",
              "Fast trials, demos, internal prototypes",
              "Power users, policy-heavy production usage",
            ],
          ],
        },
      },
    ],
  },
  {
    id: "system-resilience",
    title: "Chapter 6: System Resilience",
    subtitle: "Graceful handling of provider-specific failure paths",
    icon: LockKeyhole,
    sections: [
      {
        heading: "6.1 Dynamic Routing + Explicit Error Semantics",
        paragraphs: [
          "The backend handles provider-specific exceptions as first-class behaviors: Groq rate pressure surfaces as `429`, OpenAI auth failures surface as `401`.",
          "The frontend response strategy is equally explicit: invalid OpenAI credentials are cleared and settings are reopened; Groq limit events preserve user context and encourage retry or provider switch.",
        ],
      },
      {
        heading: "6.2 Why This Is Enterprise-Grade",
        paragraphs: [
          "Resilience is not only about avoiding crashes. It is about preserving user momentum under vendor constraints while keeping control-plane decisions transparent.",
          "This architecture gives DocuMind strategic leverage: teams are not trapped by one vendor's limits, pricing, or outages.",
        ],
        bullets: [
          "Provider-aware fallback logic reduces operational dead-ends.",
          "Session continuity is maintained across model-provider switches.",
          "The platform remains adaptable as model market conditions evolve.",
        ],
      },
      {
        heading: "6.3 Product Architect Outcome",
        paragraphs: [
          "Artem Moshnin's design objective is clear: convert model capability into reliable business throughput. Vendor abstraction, decoupled embeddings, and resilient error handling together create a durable enterprise product, not a single-provider demo.",
        ],
      },
    ],
  },
];

const architecturePrinciples = [
  "Ground every answer in retrievable evidence.",
  "Prefer explicit contracts over hidden coupling.",
  "Prevent vendor lock-in through provider abstraction.",
  "Optimize for explainability and operational resilience.",
];

const executiveWhatWeBuiltSections = [
  {
    title: "The LLM Router Pattern",
    summary:
      "DocuMind dynamically routes generation to Groq or OpenAI via one stable API surface.",
    whatBuilt:
      "Default runtime is Groq + Llama 3 for speed and zero-friction onboarding; OpenAI BYOK is the controlled fallback for power users.",
    complexity: [
      "Provider routing is explicit and validated server-side.",
      "Frontend and backend coordinate on provider headers and recovery UX.",
      "This is a deliberate anti-lock-in architecture strategy.",
    ],
  },
  {
    title: "Decoupled Embeddings",
    summary:
      "Vector indexing uses a provider-independent embedding model: `all-MiniLM-L6-v2`.",
    whatBuilt:
      "By separating embeddings from generation, DocuMind allows provider switching without re-indexing uploaded PDFs.",
    complexity: [
      "Stable retrieval corpus across Groq/OpenAI toggles.",
      "Lower indexing churn and lower cost footprint.",
      "Mid-conversation provider switches remain practical.",
    ],
  },
  {
    title: "Resilience and ROI",
    summary:
      "DocuMind handles 429 (Groq limits) and 401 (OpenAI auth) as designed operational states, not edge-case failures.",
    whatBuilt:
      "Provider-specific exception handling, explicit user messaging, and fallback paths keep workflows moving and protect business productivity.",
    complexity: [
      "Rate-limit events do not corrupt session context.",
      "Credential failures trigger targeted remediation flows.",
      "Teams keep optionality as vendor conditions change.",
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
                Vendor-agnostic RAG system design for enterprise reliability and
                speed.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm leading-7 text-muted-foreground">
                DocuMind is now a highly decoupled RAG platform. Retrieval,
                embeddings, generation routing, security boundaries, and recovery
                logic are intentionally separated so the product can evolve
                across model vendors without replatforming.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {architecturePrinciples.map((principle, index) => (
                  <div
                    key={`${principle}-${index}`}
                    className="rounded-md border bg-muted/30 px-3 py-2 text-sm"
                  >
                    {principle}
                  </div>
                ))}
              </div>
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
                          <li key={`${section.title}-${pointIndex}`}>{point}</li>
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
                  {chapter.sections.map((section, sectionIndex) => (
                    <section
                      key={`${chapter.id}-section-${sectionIndex}`}
                      className="space-y-3"
                    >
                      <h3 className="text-base font-semibold tracking-tight">
                        {section.heading}
                      </h3>
                      {section.paragraphs.map((paragraph, paragraphIndex) => (
                        <p
                          key={`${chapter.id}-${sectionIndex}-paragraph-${paragraphIndex}`}
                          className="text-sm leading-7 text-muted-foreground"
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
                            <p className="text-sm leading-7 text-muted-foreground">
                              {section.alert.body}
                            </p>
                          </CardContent>
                        </Card>
                      ) : null}
                      {section.bullets ? (
                        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
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
                        <div className="overflow-x-auto rounded-md border">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-muted/40">
                              <tr>
                                {section.table.columns.map((column, columnIndex) => (
                                  <th
                                    key={`${chapter.id}-${sectionIndex}-col-${columnIndex}`}
                                    className="px-3 py-2 font-semibold"
                                  >
                                    {column}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {section.table.rows.map((row, rowIndex) => (
                                <tr
                                  key={`${chapter.id}-${sectionIndex}-row-${rowIndex}`}
                                  className="border-t"
                                >
                                  {row.map((cell, cellIndex) => (
                                    <td
                                      key={`${chapter.id}-${sectionIndex}-${rowIndex}-${cellIndex}`}
                                      className="px-3 py-2 align-top text-muted-foreground"
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
