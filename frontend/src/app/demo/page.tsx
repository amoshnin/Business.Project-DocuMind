"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, BookOpenText, Settings, SlidersHorizontal, Sparkles } from "lucide-react";

import { ChatInterface } from "@/components/ChatInterface";
import { BackendStatusBanner } from "@/components/BackendStatusBanner";
import { DocumentPanel } from "@/components/DocumentPanel";
import { RuntimeConfigModal } from "@/components/RuntimeConfigModal";
import { SettingsModal } from "@/components/SettingsModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { DOCUMIND_AUTH_ERROR_EVENT } from "@/lib/api-client";
import { getUserApiKey } from "@/lib/api-key";
import { ensureBackendWakeup } from "@/lib/backend-status";
import { Citation } from "@/lib/citations";
import { getModelProvider, type ModelProvider } from "@/lib/model-provider";

export default function Home() {
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRuntimeConfigOpen, setIsRuntimeConfigOpen] = useState(false);
  const [chatSessionKey, setChatSessionKey] = useState(0);
  const [isCurrentSessionUsed, setIsCurrentSessionUsed] = useState(false);
  const [modelProvider, setModelProvider] = useState<ModelProvider>("groq");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isDocumentReady, setIsDocumentReady] = useState(false);
  const [settingsErrorMessage, setSettingsErrorMessage] = useState<
    string | null
  >(null);

  useEffect(() => {
    ensureBackendWakeup();
  }, []);

  useEffect(() => {
    const handleAuthError = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      setSettingsErrorMessage(
        customEvent.detail?.message ??
          "Unauthorized request. Please review AI Engine settings.",
      );
      setModelProvider(getModelProvider());
      setHasApiKey(false);
      setIsSettingsModalOpen(true);
    };

    window.addEventListener(DOCUMIND_AUTH_ERROR_EVENT, handleAuthError);
    return () => {
      window.removeEventListener(DOCUMIND_AUTH_ERROR_EVENT, handleAuthError);
    };
  }, []);

  useEffect(() => {
    const syncFromStorage = () => {
      setModelProvider(getModelProvider());
      setHasApiKey(Boolean(getUserApiKey()));
    };
    const syncTimeout = window.setTimeout(syncFromStorage, 0);
    return () => window.clearTimeout(syncTimeout);
  }, []);

  const onSettingsModalChange = (open: boolean) => {
    setIsSettingsModalOpen(open);
    if (!open) {
      setSettingsErrorMessage(null);
      setModelProvider(getModelProvider());
      setHasApiKey(Boolean(getUserApiKey()));
    }
  };

  const requiresOpenAIKey = modelProvider === "openai";
  const canSendMessages = (requiresOpenAIKey ? hasApiKey : true) && isDocumentReady;
  const selectedEngineLabel =
    modelProvider === "openai" ? "OpenAI · GPT-4o" : "Groq · Llama 3";

  const chatBlockedReason =
    requiresOpenAIKey && !hasApiKey && !isDocumentReady
      ? "OpenAI is selected. Add your API key and upload a PDF to continue."
      : requiresOpenAIKey && !hasApiKey
        ? "OpenAI is selected. Add your API key in Settings to continue."
        : !isDocumentReady
          ? "Upload a PDF document before sending questions."
          : null;

  const startNewSession = () => {
    setChatSessionKey((current) => current + 1);
    setIsCurrentSessionUsed(false);
    setActiveCitation(null);
  };

  return (
    <div className="h-dvh overflow-hidden bg-background">
      <BackendStatusBanner />
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
              <span className="hidden items-center rounded-md border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
                Engine: {selectedEngineLabel}
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
                AI Engine
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRuntimeConfigOpen(true)}
              >
                <SlidersHorizontal className="size-4" />
                RAG Config
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/architecture">
                  <BookOpenText className="size-4" />
                  Architecture
                </Link>
              </Button>
              {isCurrentSessionUsed ? (
                <Button variant="outline" size="sm" onClick={startNewSession}>
                  <Sparkles className="size-4" />
                  New Session
                </Button>
              ) : null}
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-[3fr_2fr] lg:gap-6 lg:p-6">
          <ChatInterface
            key={chatSessionKey}
            activeCitation={activeCitation}
            onActiveCitationChange={setActiveCitation}
            canSendMessages={canSendMessages}
            blockedReason={chatBlockedReason}
            onSessionUsedChange={setIsCurrentSessionUsed}
          />
          <DocumentPanel
            activeCitation={activeCitation}
            onDocumentReadyChange={setIsDocumentReady}
          />
        </main>
        {isSettingsModalOpen ? (
          <SettingsModal
            open={isSettingsModalOpen}
            onOpenChange={onSettingsModalChange}
            errorMessage={settingsErrorMessage}
          />
        ) : null}
        {isRuntimeConfigOpen ? (
          <RuntimeConfigModal
            open={isRuntimeConfigOpen}
            onOpenChange={setIsRuntimeConfigOpen}
          />
        ) : null}
      </div>
    </div>
  );
}
