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
      "A polished interface that demonstrates how teams can work with internal documents using grounded AI.",
  },
  {
    icon: Layers3,
    label: "Pipeline",
    title: "Ingestion, retrieval, and chat in one flow",
    description:
      "From PDF upload and chunking through retrieval and response generation, the full journey is represented.",
  },
  {
    icon: BookOpenText,
    label: "Documentation",
    title: "Architecture mini-book included",
    description:
      "A dedicated architecture view explains key implementation decisions in a readable, structured format.",
  },
]

export default function LandingPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#f7f4ee] text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-4rem] top-8 h-72 w-72 rounded-full bg-[#dfe7f8] blur-3xl" />
        <div className="absolute right-[-4rem] top-20 h-80 w-80 rounded-full bg-[#efe2d0] blur-3xl" />
        <div className="absolute bottom-[-3rem] left-1/3 h-72 w-[34rem] rounded-full bg-white/80 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl border border-black/5 bg-white/80 px-4 py-3 shadow-[0_12px_40px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                <Bot className="size-5 text-slate-700" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight text-slate-900">
                  DocuMind
                </p>
                <p className="text-xs text-slate-500">Product landing page</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 sm:block">
                Artem Moshnin · Lead Software Engineer
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <section className="grid items-stretch gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              <Sparkles className="size-3.5 text-slate-500" />
              Modern, professional document intelligence showcase
            </div>

            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              DocuMind brings clarity to document-based AI workflows.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              This project presents DocuMind as a polished experience for
              uploading documents, asking grounded questions, and reviewing cited
              answers. It also includes a dedicated architecture guide for a
              deeper technical walkthrough.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-11 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
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
                className="h-11 rounded-xl border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              >
                <Link href="/architecture">
                  <BookOpenText className="size-4" />
                  Read the Architecture
                </Link>
              </Button>
            </div>

            <div className="mt-10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    At a glance
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    A cleaner overview of what is included in this project
                  </p>
                </div>
                <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 sm:block">
                  Product + Architecture
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {overviewCards.map(({ icon: Icon, label, title, description }) => (
                  <article
                    key={title}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.3)] transition-colors hover:border-slate-300"
                  >
                    <div className="mb-3 flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
                      <Icon className="size-4" />
                    </div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                      {label}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold leading-5 text-slate-900">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <section className="rounded-3xl border border-black/5 bg-white/90 p-5 shadow-[0_25px_70px_-50px_rgba(15,23,42,0.35)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                    Creator
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    Artem Moshnin
                  </h2>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                  Lead Software Engineer
                </div>
              </div>

              <p className="text-sm leading-7 text-slate-600">
                Artem Moshnin built DocuMind as a product-minded demonstration
                of document intelligence: an experience that is simple to use,
                grounded in source content, and supported by clear engineering
                decisions.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-slate-800">
                    <UserRound className="size-4" />
                    <p className="text-sm font-medium">UX Focus</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Designed for clarity, trust, and a smooth workflow from file
                    upload to answer review.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Workflow className="size-4" />
                    <p className="text-sm font-medium">Technical Depth</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Includes ingestion, retrieval, streaming responses, and a
                    vendor-agnostic AI integration approach.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-black/5 bg-[#fbfaf7] p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.3)]">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-800">
                <MessageSquareQuote className="size-4 text-slate-500" />
                Product qualities
              </div>
              <div className="space-y-3">
                {highlights.map(({ icon: Icon, title, description }) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                        <Icon className="size-4 text-slate-700" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          {title}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
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

        <section className="mt-6 rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_25px_70px_-50px_rgba(15,23,42,0.35)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                Next step
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Choose how you want to explore DocuMind.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Start with the live demo to experience the workflow, or open the
                architecture guide for a structured walkthrough of system
                decisions and implementation details.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-11 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
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
                className="h-11 rounded-xl border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              >
                <Link href="/architecture">Read the Architecture</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
