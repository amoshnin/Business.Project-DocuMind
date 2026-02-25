import Link from "next/link"
import {
  ArrowRight,
  BookOpenText,
  Bot,
  Briefcase,
  Layers3,
  MessageSquareQuote,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
  Workflow,
} from "lucide-react"

import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"

const highlights = [
  {
    icon: Workflow,
    title: "Reliable Retrieval Foundation",
    description:
      "Hybrid retrieval combines lexical and semantic search to keep answers grounded in the uploaded source material.",
  },
  {
    icon: Sparkles,
    title: "Clear, Cited Responses",
    description:
      "Answers are fast and easy to review, with page-level citations that support trust and verification.",
  },
  {
    icon: ShieldCheck,
    title: "Flexible Provider Support",
    description:
      "The product is structured to support multiple model providers while keeping configuration explicit and maintainable.",
  },
]

const overviewCards = [
  {
    icon: Briefcase,
    label: "Workspace",
    title: "Enterprise-style document AI demo",
    description:
      "A polished interface that shows how teams can work with internal documents using grounded AI.",
  },
  {
    icon: Layers3,
    label: "Pipeline",
    title: "Ingestion, retrieval, and chat in one flow",
    description:
      "The flow covers PDF upload, chunking, retrieval, and answer generation in one experience.",
  },
  {
    icon: BookOpenText,
    label: "Documentation",
    title: "Architecture mini-book included",
    description:
      "A dedicated architecture view explains the key implementation decisions in a structured format.",
  },
]

export default function LandingPage() {
  return (
    <main className="relative h-dvh overflow-hidden bg-[#0c0f14] text-zinc-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-4rem] top-8 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute right-[-4rem] top-16 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="absolute bottom-[-4rem] left-1/3 h-72 w-[34rem] rounded-full bg-emerald-300/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-7xl flex-col px-4 pb-5 pt-3 sm:px-6 lg:px-8">
        <header className="mb-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 shadow-[0_12px_40px_-30px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <Bot className="size-4 text-zinc-200" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight text-zinc-100">
                  DocuMind
                </p>
                <p className="text-xs text-zinc-400">Product landing page</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-300 sm:block">
                Artem Moshnin · Lead Software Engineer
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 items-stretch gap-5 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_30px_90px_-60px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:p-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-300">
              <Sparkles className="size-3.5 text-zinc-300" />
              Professional document intelligence showcase
            </div>

            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
              DocuMind brings clarity to document-based AI workflows.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
              This project presents DocuMind as a polished experience for
              uploading documents, asking grounded questions, and reviewing cited
              answers. It also includes a dedicated architecture guide for a
              deeper technical walkthrough.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-11 rounded-xl bg-white text-black hover:bg-zinc-200"
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

            <div className="mt-7">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
                    At a glance
                  </p>
                  <p className="mt-1 text-sm text-zinc-300">
                    What is included in this project
                  </p>
                </div>
                <div className="hidden rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-300 sm:block">
                  Product + Architecture
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {overviewCards.map(({ icon: Icon, label, title, description }) => (
                  <article
                    key={title}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4 transition-colors hover:bg-white/10"
                  >
                    <div className="mb-3 flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-200">
                      <Icon className="size-4" />
                    </div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
                      {label}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold leading-5 text-white">
                      {title}
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-zinc-300">
                      {description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.8)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">
                    Creator
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    Artem Moshnin
                  </h2>
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-300">
                  Lead Software Engineer
                </div>
              </div>

              <p className="text-sm leading-6 text-zinc-300">
                I&apos;m Artem Moshnin. I built DocuMind as an engineering
                challenge and product design exercise: to create a document AI
                experience that feels clean, trustworthy, and grounded in source
                evidence.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-zinc-100">
                    <UserRound className="size-4" />
                    <p className="text-sm font-medium">UX Focus</p>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-zinc-300">
                    Designed for clarity, trust, and a smooth workflow from file
                    upload to answer review.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-zinc-100">
                    <Workflow className="size-4" />
                    <p className="text-sm font-medium">Technical Depth</p>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-zinc-300">
                    Includes ingestion, retrieval, streaming responses, and a
                    vendor-agnostic AI integration approach.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-black/20 p-5 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.75)]">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-100">
                <MessageSquareQuote className="size-4 text-zinc-300" />
                Product qualities
              </div>
              <div className="space-y-3">
                {highlights.map(({ icon: Icon, title, description }) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/20">
                        <Icon className="size-4 text-zinc-200" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          {title}
                        </h3>
                        <p className="mt-1 text-sm leading-5 text-zinc-300">
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
      </div>
    </main>
  )
}
