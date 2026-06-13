// ─────────────────────────────────────────────────────────────────────────────
// Centralized AI Service — Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────

import type { AIRequest, AIResponse, AIService } from "./types";
import { AIRateLimitError, AITimeoutError, AIProviderError } from "./errors";
import { AILogger } from "./logger";
import { resolveProviderForTask, resolveFallbackProvider } from "./config";

export class CentralAIService implements AIService {
  private logger = new AILogger();

  async callModel(request: AIRequest): Promise<AIResponse> {
    // 1. Resolve the provider for this specific task
    const primary = resolveProviderForTask(request.task);
    const startTime = Date.now();

    try {
      const response = await primary.generate(request);
      this.logger.logSuccess(request, response, Date.now() - startTime);
      return response;
    } catch (primaryError) {
      this.logger.logFailure(
        request,
        primary.name,
        primaryError,
        Date.now() - startTime
      );

      // 2. Attempt fallback if the error is eligible
      const fallback = resolveFallbackProvider();
      if (fallback && fallback.name !== primary.name && this.isFallbackEligible(primaryError)) {
        this.logger.logFallback(request, primary.name, fallback.name);
        const fallbackStart = Date.now();

        try {
          const response = await fallback.generate(request);
          this.logger.logSuccess(
            request,
            response,
            Date.now() - fallbackStart,
            true
          );
          return response;
        } catch (fallbackError) {
          this.logger.logFailure(
            request,
            fallback.name,
            fallbackError,
            Date.now() - fallbackStart
          );
          throw fallbackError;
        }
      }

      throw primaryError;
    }
  }

  private isFallbackEligible(error: unknown): boolean {
    return (
      error instanceof AIRateLimitError ||
      error instanceof AITimeoutError ||
      (error instanceof AIProviderError &&
        error.statusCode !== null &&
        [500, 502, 503, 504].includes(error.statusCode))
    );
  }
}
