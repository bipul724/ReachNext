// ─────────────────────────────────────────────────────────────────────────────
// Centralized AI Service — Public API (Lazy Singleton)
// ─────────────────────────────────────────────────────────────────────────────

import { CentralAIService } from "./ai-service";
import type { AIService } from "./types";

let singleton: AIService | null = null;

/**
 * Returns the lazily-initialized AI service singleton.
 * Providers are only instantiated on the first call, preventing
 * application boot failures due to missing API keys when AI
 * features are not in use.
 */
export function getAIService(): AIService {
  if (!singleton) {
    singleton = new CentralAIService();
  }
  return singleton;
}

// Re-export types and errors for convenience
export type { AIRequest, AIResponse, AIProvider, AIService } from "./types";
export {
  AIProviderError,
  AIRateLimitError,
  AITimeoutError,
  AIValidationError,
} from "./errors";
