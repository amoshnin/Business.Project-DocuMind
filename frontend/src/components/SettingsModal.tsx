"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getUserApiKey, setUserApiKey } from "@/lib/api-key";
import {
  getModelProvider,
  setModelProvider,
  type ModelProvider,
} from "@/lib/model-provider";

type SettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errorMessage?: string | null;
};

export function SettingsModal({
  open,
  onOpenChange,
  errorMessage,
}: SettingsModalProps) {
  const [apiKey, setApiKeyValue] = useState(() => getUserApiKey() ?? "");
  const [provider, setProvider] = useState<ModelProvider>(() =>
    getModelProvider(),
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setApiKeyValue(getUserApiKey() ?? "");
      setProvider(getModelProvider());
    }

    onOpenChange(nextOpen);
  };

  const saveSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setModelProvider(provider);

    if (provider === "openai") {
      setUserApiKey(apiKey);
    }

    onOpenChange(false);
  };

  const isSaveDisabled = provider === "openai" && !apiKey.trim();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings: AI Engine & Security</DialogTitle>
          <DialogDescription>
            Select your model provider and security mode for DocuMind.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={saveSettings}>
          <div className="space-y-2">
            <label htmlFor="ai-engine" className="text-sm font-medium">
              AI Engine
            </label>
            <select
              id="ai-engine"
              value={provider}
              onChange={(event) =>
                setProvider(event.target.value === "openai" ? "openai" : "groq")
              }
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring/50 flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]"
            >
              <option value="groq">Groq (Llama 3 - Default)</option>
              <option value="openai">OpenAI (GPT-4o)</option>
            </select>
          </div>

          {provider === "groq" ? (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <p className="text-sm font-medium">Provider Info</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Using Llama 3 via Groq. No API key required. Note: Subject to
                strict rate limits (requests per minute) on the free tier.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor="openai-api-key" className="text-sm font-medium">
                  OpenAI API Key
                </label>
                <Input
                  id="openai-api-key"
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKeyValue(event.target.value)}
                  placeholder="sk-..."
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                <p className="text-sm font-medium">Provider Info</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Bring Your Own Key (BYOK). Your key is stored securely in your
                  browser and never saved on our servers.
                </p>
              </div>
            </>
          )}

          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}

          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <p className="text-sm font-medium">Security Configuration</p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              <li>
                Model preference is saved locally under `DOCUMIND_MODEL_PROVIDER`.
              </li>
              <li>
                OpenAI keys are saved locally under `DOCUMIND_USER_KEY` and only
                sent when OpenAI is selected.
              </li>
              <li>
                Requests include `X-Model-Provider`; `X-OpenAI-Key` is attached
                only for OpenAI mode.
              </li>
              <li>
                On `401 Unauthorized`, credentials are cleared and this modal is
                reopened automatically.
              </li>
            </ul>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaveDisabled}>
              Save Settings
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
