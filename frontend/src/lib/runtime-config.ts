export type RuntimeConfig = {
  chunkSize: number;
  chunkOverlap: number;
  denseK: number;
  bm25K: number;
  denseWeight: number;
  temperature: number;
};

export const DOCUMIND_RUNTIME_CONFIG = "DOCUMIND_RUNTIME_CONFIG";

export const RUNTIME_CONFIG_DEFAULTS: RuntimeConfig = {
  chunkSize: 1000,
  chunkOverlap: 150,
  denseK: 3,
  bm25K: 3,
  denseWeight: 0.5,
  temperature: 0,
};

const RUNTIME_CONFIG_RANGES = {
  chunkSize: { min: 400, max: 2200 },
  chunkOverlap: { min: 50, max: 400 },
  denseK: { min: 2, max: 8 },
  bm25K: { min: 2, max: 8 },
  denseWeight: { min: 0.2, max: 0.8 },
  temperature: { min: 0, max: 1 },
};

const clampInt = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(value)));

const clampFloat = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const parseNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

export function normalizeRuntimeConfig(
  input?: Partial<RuntimeConfig> | null,
): RuntimeConfig {
  const chunkSize = clampInt(
    parseNumber(input?.chunkSize, RUNTIME_CONFIG_DEFAULTS.chunkSize),
    RUNTIME_CONFIG_RANGES.chunkSize.min,
    RUNTIME_CONFIG_RANGES.chunkSize.max,
  );

  const chunkOverlapRaw = clampInt(
    parseNumber(input?.chunkOverlap, RUNTIME_CONFIG_DEFAULTS.chunkOverlap),
    RUNTIME_CONFIG_RANGES.chunkOverlap.min,
    RUNTIME_CONFIG_RANGES.chunkOverlap.max,
  );

  return {
    chunkSize,
    chunkOverlap: Math.min(chunkOverlapRaw, Math.max(50, chunkSize - 1)),
    denseK: clampInt(
      parseNumber(input?.denseK, RUNTIME_CONFIG_DEFAULTS.denseK),
      RUNTIME_CONFIG_RANGES.denseK.min,
      RUNTIME_CONFIG_RANGES.denseK.max,
    ),
    bm25K: clampInt(
      parseNumber(input?.bm25K, RUNTIME_CONFIG_DEFAULTS.bm25K),
      RUNTIME_CONFIG_RANGES.bm25K.min,
      RUNTIME_CONFIG_RANGES.bm25K.max,
    ),
    denseWeight: clampFloat(
      parseNumber(input?.denseWeight, RUNTIME_CONFIG_DEFAULTS.denseWeight),
      RUNTIME_CONFIG_RANGES.denseWeight.min,
      RUNTIME_CONFIG_RANGES.denseWeight.max,
    ),
    temperature: clampFloat(
      parseNumber(input?.temperature, RUNTIME_CONFIG_DEFAULTS.temperature),
      RUNTIME_CONFIG_RANGES.temperature.min,
      RUNTIME_CONFIG_RANGES.temperature.max,
    ),
  };
}

export function getRuntimeConfig(): RuntimeConfig {
  if (typeof window === "undefined") {
    return RUNTIME_CONFIG_DEFAULTS;
  }

  const rawConfig = window.localStorage.getItem(DOCUMIND_RUNTIME_CONFIG);
  if (!rawConfig) {
    return RUNTIME_CONFIG_DEFAULTS;
  }

  try {
    const parsed = JSON.parse(rawConfig) as Partial<RuntimeConfig>;
    return normalizeRuntimeConfig(parsed);
  } catch {
    return RUNTIME_CONFIG_DEFAULTS;
  }
}

export function setRuntimeConfig(config: RuntimeConfig) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeRuntimeConfig(config);
  window.localStorage.setItem(DOCUMIND_RUNTIME_CONFIG, JSON.stringify(normalized));
}
