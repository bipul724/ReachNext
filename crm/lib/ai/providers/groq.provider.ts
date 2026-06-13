// ─────────────────────────────────────────────────────────────────────────────
// Groq Provider Adapter (Llama-3.3-70b via OpenAI-compatible API)
// ─────────────────────────────────────────────────────────────────────────────

import type { AIProvider, AIRequest, AIResponse } from "../types";
import {
  AIProviderError,
  AIRateLimitError,
  AITimeoutError,
} from "../errors";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GroqProvider implements AIProvider {
  readonly name = "groq";
  private apiKey: string;

  constructor() {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
      throw new Error("GROQ_API_KEY is not configured in crm/.env");
    }
    this.apiKey = key;
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const model = request.model || DEFAULT_MODEL;
    const timeoutMs = request.timeoutMs ?? 15000;
    const maxRetries = request.maxRetries ?? 2;
    const temperature = request.temperature ?? 0.1;

    // Build messages array (Groq uses OpenAI chat format)
    const messages: Array<{ role: string; content: string }> = [];
    if (request.systemPrompt) {
      messages.push({ role: "system", content: request.systemPrompt });
    }
    messages.push({ role: "user", content: request.userPrompt });

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            ...(request.maxTokens && { max_tokens: request.maxTokens }),
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text();
          if (response.status === 429) {
            throw new AIRateLimitError("groq", `Groq rate limited: ${errText}`);
          }
          throw new AIProviderError(
            "groq",
            response.status,
            `Groq API error (status ${response.status}): ${errText}`
          );
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;

        if (typeof text !== "string") {
          throw new AIProviderError(
            "groq",
            null,
            "Groq returned unexpected response format (missing choices[0].message.content)"
          );
        }

        return {
          text: text.trim(),
          usage: data.usage
            ? {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
              }
            : undefined,
          provider: "groq",
          model,
        };
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        lastError = error;

        // Wrap AbortError as AITimeoutError
        if (error instanceof Error && error.name === "AbortError") {
          lastError = new AITimeoutError("groq", timeoutMs);
        }

        // Check if retryable
        const isRetryable =
          lastError instanceof AIRateLimitError ||
          lastError instanceof AITimeoutError ||
          (lastError instanceof AIProviderError &&
            lastError.statusCode !== null &&
            RETRYABLE_STATUS_CODES.has(lastError.statusCode)) ||
          (error instanceof TypeError && error.message.includes("fetch"));

        if (isRetryable && attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000;
          console.warn(
            `⏳ Groq attempt ${attempt + 1} failed (${lastError instanceof Error ? lastError.name : "unknown"}). Retrying in ${delayMs}ms...`
          );
          await sleep(delayMs);
          continue;
        }

        throw lastError;
      }
    }

    throw lastError;
  }
}
