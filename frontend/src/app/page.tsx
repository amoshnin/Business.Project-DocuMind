import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Bot,
  FileText,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

const highlights = [
  {
    icon: Workflow,
    title: "Hybrid Retrieval Pipeline",
    description:
      "BM25 + vector search with rank fusion for grounded answers across messy real-world PDFs.",
  },
  {
    icon: Sparkles,
    title: "Streaming, Citation-First UX",
    description:
      "Answers render progressively while preserving typed citations and page-level provenance.",
  },
  {
    icon: ShieldCheck,
    title: "Vendor-Agnostic AI Routing",
    description:
      "Designed to run with Groq or OpenAI, with BYOK support and explicit provider contracts.",
  },
];

const quickFacts = [
  "Enterprise-style RAG demo workspace",
  "PDF ingestion + chunking + retrieval + chat",
  "Architecture mini-book included",
];

export default function LandingPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#06090f] text-zinc-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-cyan-400/18 blur-3xl" />
        <div className="absolute right-[-3rem] top-28 h-80 w-80 rounded-full bg-emerald-400/12 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-[42rem] -translate-x-1/2 bg-gradient-to-r from-cyan-500/0 via-cyan-400/10 to-emerald-400/0 blur-2xl" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10">
                <Bot className="size-5 text-cyan-200" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-[0.18em] text-zinc-200">
                  DOCUMIND
                </p>
                <p className="text-xs text-zinc-400">
                  RAG Demo Product Experience
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-zinc-300 sm:block">
                Artem Moshnin · Lead Software Engineer
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <section className="grid items-stretch gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 to-white/3 p-6 shadow-[0_25px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
              <Sparkles className="size-3.5" />
              Modern Document Intelligence Showcase
            </div>

            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              DocuMind transforms PDFs into a fast, grounded AI workspace.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
              DocuMind is a sleek, production-minded RAG experience built to
              ingest documents, retrieve relevant evidence, and stream cited
              answers with a clean operator workflow. This project showcases the
              full product surface and the engineering architecture behind it.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-11 rounded-xl bg-cyan-300 text-slate-950 hover:bg-cyan-200"
              >
                <Link href="/demo">
                  <PlayCircle className="size-4" />
                  Run the Demo
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href="/architecture">
                  <BookOpenText className="size-4" />
                  Read the Architecture
                </Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {quickFacts.map((fact) => (
                <div
                  key={fact}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200"
                >
                  {fact}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <section className="rounded-3xl border border-white/10 bg-black/30 p-5 shadow-[0_20px_70px_-35px_rgba(6,182,212,0.45)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-400">
                    Creator
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    Artem Moshnin
                  </h2>
                </div>
                <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
                  Lead Software Engineer
                </div>
              </div>
              <p className="text-sm leading-7 text-zinc-300">
                I designed and built DocuMind as a polished document-AI demo
                that balances product experience, RAG reliability, and readable
                architecture. The goal is to show both what users feel and what
                engineers can trust.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">
                    Focus
                  </p>
                  <p className="mt-2 text-sm text-zinc-200">
                    Product-grade UX with traceable, grounded outputs.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">
                    Stack
                  </p>
                  <p className="mt-2 text-sm text-zinc-200">
                    Next.js frontend + FastAPI backend + hybrid retrieval.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b1420]/90 via-[#0c1118]/90 to-[#10191a]/90 p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-200">
                <FileText className="size-4 text-cyan-200" />
                Project Highlights
              </div>
              <div className="space-y-3">
                {highlights.map(({ icon: Icon, title, description }) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/25">
                        <Icon className="size-4 text-cyan-100" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          {title}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-zinc-300">
                          {description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-400">
                Next Step
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Explore the product experience or inspect the system design.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
                Start with the live demo to see the end-user workflow, then open
                the architecture mini-book for a deeper breakdown of ingestion,
                retrieval, streaming, and provider routing decisions.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-11 rounded-xl bg-white text-black hover:bg-zinc-200"
              >
                <Link href="/demo">
                  Run the Demo
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 rounded-xl border-white/15 bg-transparent text-white hover:bg-white/10"
              >
                <Link href="/architecture">Read the Architecture</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
