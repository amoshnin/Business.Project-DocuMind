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
import {
  getRuntimeConfig,
  normalizeRuntimeConfig,
  RUNTIME_CONFIG_DEFAULTS,
  setRuntimeConfig,
  type RuntimeConfig,
} from "@/lib/runtime-config"

type RuntimeConfigModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RuntimeConfigModal({
  open,
  onOpenChange,
}: RuntimeConfigModalProps) {
  const [runtimeConfig, setRuntimeConfigState] = useState<RuntimeConfig>(() =>
    getRuntimeConfig(),
  )

  const saveSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRuntimeConfig(runtimeConfig)
    onOpenChange(false)
  }

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>RAG Control Panel</DialogTitle>
          <DialogDescription>
            These controls apply globally to DocuMind across all AI engines.
            Ingestion controls apply on the next PDF upload. Retrieval and
            generation controls apply on the next question.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={saveSettings}>
          <div className="space-y-3 rounded-md border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Global Runtime Controls</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setRuntimeConfigState(RUNTIME_CONFIG_DEFAULTS)}
              >
                Reset Defaults
              </Button>
            </div>

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
                Blending ratio in hybrid retrieval. BM25 weight is automatically
                set to 1 - Dense Weight.
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save RAG Config</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
