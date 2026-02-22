"use client";

import { useState } from "react";
import { Bot, Sparkles } from "lucide-react";

import { ChatInterface } from "@/components/ChatInterface";
import { DocumentPanel } from "@/components/DocumentPanel";
import { Button } from "@/components/ui/button";
import { Citation } from "@/lib/citations";

export default function Home() {
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  return (
    <div className="h-dvh overflow-hidden bg-background">
      <div className="flex h-full flex-col">
        <header className="border-b bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50">
          <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-2">
              <Bot className="size-5 text-primary" />
              <span className="text-sm font-semibold tracking-wide">
                DocuMind
              </span>
            </div>
            <Button variant="outline" size="sm">
              <Sparkles className="size-4" />
              New Session
            </Button>
          </div>
        </header>

        <main className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-[3fr_2fr] lg:gap-6 lg:p-6">
          <ChatInterface
            activeCitation={activeCitation}
            onActiveCitationChange={setActiveCitation}
          />
          <DocumentPanel activeCitation={activeCitation} />
        </main>
      </div>
    </div>
  );
}
