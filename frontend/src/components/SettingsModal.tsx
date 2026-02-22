"use client"

import { FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getUserApiKey, setUserApiKey } from "@/lib/api-key"
import {
  getModelProvider,
  setModelProvider,
  type ModelProvider,
} from "@/lib/model-provider"
import {
  getRuntimeConfig,
  normalizeRuntimeConfig,
  RUNTIME_CONFIG_DEFAULTS,
  setRuntimeConfig,
  type RuntimeConfig,
} from "@/lib/runtime-config"

type SettingsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  errorMessage?: string | null
}

export function SettingsModal({
  open,
  onOpenChange,
  errorMessage,
}: SettingsModalProps) {
  const [apiKey, setApiKeyValue] = useState(() => getUserApiKey() ?? "")
  const [provider, setProvider] = useState<ModelProvider>(() =>
    getModelProvider(),
  )
  const [runtimeConfig, setRuntimeConfigState] = useState<RuntimeConfig>(() =>
    getRuntimeConfig(),
  )

  const handleOpenChange = (nextOpen: boolean) => onOpenChange(nextOpen)

  const saveSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setModelProvider(provider)

    if (provider === "openai") {
      setUserApiKey(apiKey)
    }
    setRuntimeConfig(runtimeConfig)

    handleOpenChange(false)
  }

  const isSaveDisabled = provider === "openai" && !apiKey.trim()
  const setRuntimeValue = <Key extends keyof RuntimeConfig>(
    key: Key,
    value: number,
  ) => {
    if (!Number.isFinite(value)) {
      return
    }

    setRuntimeConfigState((current) =>
      normalizeRuntimeConfig({
        ...current,
        [key]: value,
      }),
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings: AI Engine</DialogTitle>
          <DialogDescription>
            Configure model provider and runtime controls for DocuMind.
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
            <p className="text-xs text-muted-foreground">
              You can switch engines at any time. The selected engine applies
              to the next message in this same chat session.
            </p>
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
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                <p className="text-sm font-medium">Security Configuration</p>
                <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  <li>Model preference is saved locally.</li>
                  <li>
                    OpenAI keys are saved locally in your browser only and only
                    sent to OpenAI&apos;s API when OpenAI AI Engine is selected.
                  </li>
                  <li>
                    Important Note: We do not store or have access to your
                    OpenAI API key. It is only used client-side to make requests
                    directly to OpenAI when that provider is selected.
                  </li>
                </ul>
              </div>
            </>
          )}

          <div className="space-y-3 rounded-md border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">RAG Control Panel</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setRuntimeConfigState(RUNTIME_CONFIG_DEFAULTS)}
              >
                Reset Defaults
              </Button>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Ingestion controls apply on the next PDF upload. Retrieval and
              generation controls apply on the next question.
            </p>

            <div className="space-y-2 rounded-md border bg-background/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Chunk Size</p>
                <span className="text-xs text-muted-foreground">
                  Ideal: 800 - 1400
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Bigger chunks keep broader context. Smaller chunks improve
                retrieval precision.
              </p>
              <input
                type="range"
                min={400}
                max={2200}
                step={50}
                value={runtimeConfig.chunkSize}
                onChange={(event) =>
                  setRuntimeValue("chunkSize", Number(event.target.value))
                }
                className="w-full"
              />
              <Input
                type="number"
                min={400}
                max={2200}
                step={50}
                value={runtimeConfig.chunkSize}
                onChange={(event) =>
                  setRuntimeValue("chunkSize", Number(event.target.value))
                }
              />
            </div>

            <div className="space-y-2 rounded-md border bg-background/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Chunk Overlap</p>
                <span className="text-xs text-muted-foreground">
                  Ideal: 100 - 220
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Overlap preserves facts that sit on chunk boundaries.
              </p>
              <input
                type="range"
                min={50}
                max={400}
                step={10}
                value={runtimeConfig.chunkOverlap}
                onChange={(event) =>
                  setRuntimeValue("chunkOverlap", Number(event.target.value))
                }
                className="w-full"
              />
              <Input
                type="number"
                min={50}
                max={400}
                step={10}
                value={runtimeConfig.chunkOverlap}
                onChange={(event) =>
                  setRuntimeValue("chunkOverlap", Number(event.target.value))
                }
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 rounded-md border bg-background/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Dense K</p>
                  <span className="text-xs text-muted-foreground">
                    Ideal: 3 - 5
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Number of semantic candidates from the vector store.
                </p>
                <input
                  type="range"
                  min={2}
                  max={8}
                  step={1}
                  value={runtimeConfig.denseK}
                  onChange={(event) =>
                    setRuntimeValue("denseK", Number(event.target.value))
                  }
                  className="w-full"
                />
                <Input
                  type="number"
                  min={2}
                  max={8}
                  step={1}
                  value={runtimeConfig.denseK}
                  onChange={(event) =>
                    setRuntimeValue("denseK", Number(event.target.value))
                  }
                />
              </div>

              <div className="space-y-2 rounded-md border bg-background/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">BM25 K</p>
                  <span className="text-xs text-muted-foreground">
                    Ideal: 3 - 5
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Number of lexical keyword candidates from BM25.
                </p>
                <input
                  type="range"
                  min={2}
                  max={8}
                  step={1}
                  value={runtimeConfig.bm25K}
                  onChange={(event) =>
                    setRuntimeValue("bm25K", Number(event.target.value))
                  }
                  className="w-full"
                />
                <Input
                  type="number"
                  min={2}
                  max={8}
                  step={1}
                  value={runtimeConfig.bm25K}
                  onChange={(event) =>
                    setRuntimeValue("bm25K", Number(event.target.value))
                  }
                />
              </div>
            </div>

            <div className="space-y-2 rounded-md border bg-background/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Dense Weight</p>
                <span className="text-xs text-muted-foreground">
                  Ideal: 0.45 - 0.60
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Blending ratio in hybrid retrieval. BM25 weight is
                automatically set to 1 - Dense Weight.
              </p>
              <input
                type="range"
                min={0.2}
                max={0.8}
                step={0.05}
                value={runtimeConfig.denseWeight}
                onChange={(event) =>
                  setRuntimeValue("denseWeight", Number(event.target.value))
                }
                className="w-full"
              />
              <Input
                type="number"
                min={0.2}
                max={0.8}
                step={0.05}
                value={runtimeConfig.denseWeight}
                onChange={(event) =>
                  setRuntimeValue("denseWeight", Number(event.target.value))
                }
              />
            </div>

            <div className="space-y-2 rounded-md border bg-background/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Temperature</p>
                <span className="text-xs text-muted-foreground">
                  Ideal: 0.0 - 0.2
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Lower values improve determinism and citation consistency.
              </p>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={runtimeConfig.temperature}
                onChange={(event) =>
                  setRuntimeValue("temperature", Number(event.target.value))
                }
                className="w-full"
              />
              <Input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={runtimeConfig.temperature}
                onChange={(event) =>
                  setRuntimeValue("temperature", Number(event.target.value))
                }
              />
            </div>
          </div>

          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
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
  )
}
