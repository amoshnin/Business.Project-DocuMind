"use client";

import { FormEvent, useState } from "react";
import { Loader2, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type Citation = {
  source_text: string;
  metadata?: {
    document_id?: string;
    filename?: string;
    page_number?: number;
  };
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Welcome to **DocuMind**. Upload a document and ask a question to start a grounded analysis.",
  },
];

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isTyping) return;

    setMessages((current) => [
      ...current,
      {
        role: "user",
        content: trimmed,
      },
    ]);
    setDraft("");
    setIsTyping(true);

    await new Promise((resolve) => setTimeout(resolve, 900));

    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content:
          "Generating response stream. This placeholder will be replaced by live SSE tokens in the next batch.",
      },
    ]);
    setIsTyping(false);
  };

  return (
    <Card className="flex min-h-0 flex-col overflow-hidden">
      <CardHeader className="gap-1">
        <CardTitle className="text-base">Chat Interface</CardTitle>
        <CardDescription>
          Ask document questions and review grounded, cited answers.
        </CardDescription>
      </CardHeader>
      <Separator />
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={cn(
                "max-w-[90%] rounded-lg border px-3 py-2 text-sm",
                message.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "border-border bg-transparent",
              )}
            >
              {message.role === "assistant" ? (
                <ReactMarkdown
                  components={{
                    p: (props) => (
                      <p className="leading-relaxed" {...props} />
                    ),
                    ul: (props) => (
                      <ul className="ml-5 list-disc space-y-1" {...props} />
                    ),
                    ol: (props) => (
                      <ol className="ml-5 list-decimal space-y-1" {...props} />
                    ),
                    code: (props) => (
                      <code
                        className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                        {...props}
                      />
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                <p className="leading-relaxed">{message.content}</p>
              )}
            </div>
          ))}
          {isTyping ? (
            <div className="flex max-w-[90%] items-center gap-2 rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>Generating...</span>
            </div>
          ) : null}
        </div>
      </ScrollArea>
      <Separator />
      <form onSubmit={sendMessage} className="p-4">
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about the active document..."
            aria-label="Message input"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send message"
            disabled={!draft.trim() || isTyping}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </form>
    </Card>
  );
}
