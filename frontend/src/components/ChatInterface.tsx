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
import { submitQuery } from "@/lib/chat-api";
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

type ChatStreamEvent =
  | { type: "token"; token?: string }
  | { type: "final"; payload?: { answer?: string; citations?: Citation[] } }
  | { type: "error"; message?: string };

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
  const [isGenerating, setIsGenerating] = useState(false);

  const appendTokenToAssistant = (token: string) => {
    setMessages((current) => {
      if (current.length === 0) return current;

      const next = [...current];
      const lastIndex = next.length - 1;
      const lastMessage = next[lastIndex];
      if (lastMessage.role !== "assistant") return current;

      next[lastIndex] = {
        ...lastMessage,
        content: `${lastMessage.content}${token}`,
      };
      return next;
    });
  };

  const finalizeAssistantMessage = (answer?: string, citations?: Citation[]) => {
    setMessages((current) => {
      if (current.length === 0) return current;

      const next = [...current];
      const lastIndex = next.length - 1;
      const lastMessage = next[lastIndex];
      if (lastMessage.role !== "assistant") return current;

      next[lastIndex] = {
        ...lastMessage,
        content: answer ?? lastMessage.content,
        citations: citations ?? lastMessage.citations,
      };
      return next;
    });
  };

  const appendAssistantError = (message: string) => {
    setMessages((current) => {
      if (current.length === 0) {
        return [
          ...current,
          {
            role: "assistant",
            content: `**Error:** ${message}`,
          },
        ];
      }

      const next = [...current];
      const lastIndex = next.length - 1;
      const lastMessage = next[lastIndex];

      if (lastMessage.role !== "assistant") {
        return [
          ...current,
          {
            role: "assistant",
            content: `**Error:** ${message}`,
          },
        ];
      }

      next[lastIndex] = {
        ...lastMessage,
        content:
          lastMessage.content.trim().length > 0
            ? `${lastMessage.content}\n\n**Error:** ${message}`
            : `**Error:** ${message}`,
      };
      return next;
    });
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isGenerating) return;

    setMessages((current) => [
      ...current,
      {
        role: "user",
        content: trimmed,
      },
      {
        role: "assistant",
        content: "",
      },
    ]);
    setDraft("");
    setIsTyping(true);
    setIsGenerating(true);

    let hasReceivedFirstByte = false;

    try {
      const response = await submitQuery(trimmed);
      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error("Streaming is not available in this browser.");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let shouldStop = false;

      while (!shouldStop) {
        const { value, done } = await reader.read();
        if (done) {
          buffer += decoder.decode();
          shouldStop = true;
        } else {
          buffer += decoder.decode(value, { stream: true });
        }

        let separatorIndex = buffer.indexOf("\n\n");
        while (separatorIndex !== -1) {
          const rawEvent = buffer.slice(0, separatorIndex).trim();
          buffer = buffer.slice(separatorIndex + 2);
          separatorIndex = buffer.indexOf("\n\n");

          if (!rawEvent) {
            continue;
          }

          const dataPayload = rawEvent
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n");

          if (!dataPayload) {
            continue;
          }

          if (dataPayload === "[DONE]") {
            shouldStop = true;
            break;
          }

          let parsedEvent: ChatStreamEvent;
          try {
            parsedEvent = JSON.parse(dataPayload) as ChatStreamEvent;
          } catch {
            continue;
          }

          if (!hasReceivedFirstByte) {
            hasReceivedFirstByte = true;
            setIsTyping(false);
          }

          if (parsedEvent.type === "token" && parsedEvent.token) {
            appendTokenToAssistant(parsedEvent.token);
            continue;
          }

          if (parsedEvent.type === "final") {
            finalizeAssistantMessage(
              parsedEvent.payload?.answer,
              parsedEvent.payload?.citations,
            );
            continue;
          }

          if (parsedEvent.type === "error") {
            throw new Error(parsedEvent.message ?? "Stream returned an error.");
          }
        }
      }
    } catch (error) {
      appendAssistantError(
        error instanceof Error ? error.message : "Unexpected stream failure.",
      );
    } finally {
      setIsTyping(false);
      setIsGenerating(false);
    }
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
            disabled={!draft.trim() || isGenerating}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </form>
    </Card>
  );
}
