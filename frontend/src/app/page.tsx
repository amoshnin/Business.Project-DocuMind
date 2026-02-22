"use client";

import { useEffect, useState } from "react";
import { Bot, Settings, Sparkles } from "lucide-react";

import { ChatInterface } from "@/components/ChatInterface";
import { DocumentPanel } from "@/components/DocumentPanel";
import { SettingsModal } from "@/components/SettingsModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { DOCUMIND_AUTH_ERROR_EVENT } from "@/lib/api-client";
import { Citation } from "@/lib/citations";

export default function Home() {
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsErrorMessage, setSettingsErrorMessage] = useState<
    string | null
  >(null);

  useEffect(() => {
    const handleAuthError = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      setSettingsErrorMessage(
        customEvent.detail?.message ??
          "Unauthorized request. Please update your API key.",
      );
      setIsSettingsModalOpen(true);
    };

    window.addEventListener(DOCUMIND_AUTH_ERROR_EVENT, handleAuthError);
    return () => {
      window.removeEventListener(DOCUMIND_AUTH_ERROR_EVENT, handleAuthError);
    };
  }, []);

  const onSettingsModalChange = (open: boolean) => {
    setIsSettingsModalOpen(open);
    if (!open) {
      setSettingsErrorMessage(null);
    }
  };

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
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-muted-foreground lg:inline">
                Lead Software Engineer: Artem Moshnin
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSettingsErrorMessage(null);
                  setIsSettingsModalOpen(true);
                }}
              >
                <Settings className="size-4" />
                API Key
              </Button>
              <Button variant="outline" size="sm">
                <Sparkles className="size-4" />
                New Session
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-[3fr_2fr] lg:gap-6 lg:p-6">
          <ChatInterface
            activeCitation={activeCitation}
            onActiveCitationChange={setActiveCitation}
          />
          <DocumentPanel activeCitation={activeCitation} />
        </main>
        <SettingsModal
          open={isSettingsModalOpen}
          onOpenChange={onSettingsModalChange}
          errorMessage={settingsErrorMessage}
        />
      </div>
    </div>
  );
}
