// ─────────────────────────────────────────────────────────────────────────────
// Gemini Provider Adapter (Google Generative AI SDK)
// ─────────────────────────────────────────────────────────────────────────────

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, AIRequest, AIResponse } from "../types";
import {
  AIProviderError,
  AIRateLimitError,
  AITimeoutError,
} from "../errors";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";
const RATE_LIMIT_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("429") ||
    message.toLowerCase().includes("rate limit") ||
    message.toLowerCase().includes("quota")
  );
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private genAI: GoogleGenerativeAI;
  private rateLimitedUntil = 0;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not configured in crm/.env");
    }
    this.genAI = new GoogleGenerativeAI(key);
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    // Circuit breaker: skip if recently rate-limited
    if (Date.now() < this.rateLimitedUntil) {
      throw new AIRateLimitError(
        "gemini",
        "Gemini is in rate-limit cooldown, skipping call"
      );
    }

    const modelName = request.model || DEFAULT_MODEL;
    const timeoutMs = request.timeoutMs ?? 8000;
    const model = this.genAI.getGenerativeModel({ model: modelName });

    // Gemini uses a single prompt string — concatenate system + user if both exist
    let prompt = request.userPrompt;
    if (request.systemPrompt) {
      prompt = `${request.systemPrompt}\n\n${request.userPrompt}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await model.generateContent(prompt, {
        signal: controller.signal,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const text = result.response.text();

      if (typeof text !== "string" || !text.trim()) {
        throw new AIProviderError(
          "gemini",
          null,
          "Gemini returned empty or non-string response"
        );
      }

      // Extract usage metadata if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usageMetadata = (result.response as any)?.usageMetadata;

      return {
        text: text.trim(),
        usage: usageMetadata
          ? {
              promptTokens: usageMetadata.promptTokenCount,
              completionTokens: usageMetadata.candidatesTokenCount,
              totalTokens: usageMetadata.totalTokenCount,
            }
          : undefined,
        provider: "gemini",
        model: modelName,
      };
    } catch (error) {
      // Activate circuit breaker on rate limit
      if (isRateLimitError(error)) {
        this.rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
        throw new AIRateLimitError("gemini");
      }

      // Wrap AbortError
      if (error instanceof Error && error.name === "AbortError") {
        throw new AITimeoutError("gemini", timeoutMs);
      }

      // Wrap unknown errors
      if (!(error instanceof AIProviderError)) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        let statusCode: number | null = null;
        const match = errorMessage.match(/(\d{3})\s/);
        if (match) {
          statusCode = parseInt(match[1], 10);
        }
        throw new AIProviderError(
          "gemini",
          statusCode,
          errorMessage
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
