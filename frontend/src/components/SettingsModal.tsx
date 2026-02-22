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

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setApiKeyValue(getUserApiKey() ?? "");
    }

    onOpenChange(nextOpen);
  };

  const saveKey = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUserApiKey(apiKey);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings: Bring Your Own Key</DialogTitle>
          <DialogDescription>
            Connect your OpenAI key to run model requests from this workspace.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={saveKey}>
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
          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}
          <p className="text-muted-foreground text-xs leading-relaxed">
            Privacy-First: Your key is stored locally in your browser and sent
            over encrypted HTTPS. It never touches our database.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Key</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
