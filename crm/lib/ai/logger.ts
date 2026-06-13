// ─────────────────────────────────────────────────────────────────────────────
// Centralized AI Service — Observability Logger with Cost Tracking
// ─────────────────────────────────────────────────────────────────────────────

import type { AIRequest, AIResponse } from "./types";

// ── Per-token pricing (USD) — best-effort, update as needed ──
interface ModelPricing {
  inputPerMToken: number;   // USD per 1M input tokens
  outputPerMToken: number;  // USD per 1M output tokens
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // Groq (Llama-3.3-70b)
  "llama-3.3-70b-versatile": { inputPerMToken: 0.59, outputPerMToken: 0.79 },
  // Gemini 2.5 Pro
  "gemini-2.5-pro": { inputPerMToken: 1.25, outputPerMToken: 10.0 },
  // Gemini 2.0 Flash
  "gemini-2.0-flash": { inputPerMToken: 0.10, outputPerMToken: 0.40 },
};

function estimateCost(
  model: string,
  usage?: { promptTokens?: number; completionTokens?: number }
): number | undefined {
  if (!usage) return undefined;
  const pricing = MODEL_PRICING[model];
  if (!pricing) return undefined;

  const inputTokens = usage.promptTokens || 0;
  const outputTokens = usage.completionTokens || 0;

  if (inputTokens === 0 && outputTokens === 0) return undefined;

  return (
    (inputTokens / 1_000_000) * pricing.inputPerMToken +
    (outputTokens / 1_000_000) * pricing.outputPerMToken
  );
}

export class AILogger {
  logSuccess(
    request: AIRequest,
    response: AIResponse,
    durationMs: number,
    isFallback: boolean = false
  ): void {
    const cost = estimateCost(response.model, response.usage);
    console.log(
      JSON.stringify({
        event: "ai_call_success",
        task: request.task,
        provider: response.provider,
        model: response.model,
        durationMs,
        isFallback,
        usage: response.usage || null,
        ...(cost !== undefined && { estimatedCostUsd: parseFloat(cost.toFixed(6)) }),
      })
    );
  }

  logFailure(
    request: AIRequest,
    providerName: string,
    error: unknown,
    durationMs: number
  ): void {
    console.error(
      JSON.stringify({
        event: "ai_call_failure",
        task: request.task,
        provider: providerName,
        durationMs,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : String(error),
      })
    );
  }

  logFallback(
    request: AIRequest,
    primaryProvider: string,
    fallbackProvider: string
  ): void {
    console.warn(
      JSON.stringify({
        event: "ai_call_fallback",
        task: request.task,
        primaryProvider,
        fallbackProvider,
      })
    );
  }
}
