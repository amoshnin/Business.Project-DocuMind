import { Bot, SendHorizontal, Sparkles } from "lucide-react";

import { DocumentPanel } from "@/components/DocumentPanel";
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

const messages = [
  {
    role: "assistant",
    content:
      "Welcome to DocuMind. Upload a policy, contract, or report to begin retrieval-augmented analysis.",
  },
  {
    role: "user",
    content: "Summarize the indemnification terms from the supplier agreement.",
  },
  {
    role: "assistant",
    content:
      "The agreement assigns broad indemnification liability to the supplier for third-party IP and data breach claims, with carve-outs for customer misuse.",
  },
];

export default function Home() {
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
          <Card className="flex min-h-0 flex-col overflow-hidden">
            <CardHeader className="gap-1">
              <CardTitle className="text-base">Chat Interface</CardTitle>
              <CardDescription>
                Streaming AI responses appear here during retrieval and
                generation.
              </CardDescription>
            </CardHeader>
            <Separator />
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-4 p-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`max-w-[90%] rounded-lg border px-3 py-2 text-sm ${
                      message.role === "assistant"
                        ? "bg-muted/60"
                        : "ml-auto bg-primary text-primary-foreground"
                    }`}
                  >
                    {message.content}
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Separator />
            <div className="p-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Ask about the active document..."
                  aria-label="Message input"
                />
                <Button size="icon" aria-label="Send message">
                  <SendHorizontal className="size-4" />
                </Button>
              </div>
            </div>
          </Card>

          <DocumentPanel />
        </main>
      </div>
    </div>
  );
}
