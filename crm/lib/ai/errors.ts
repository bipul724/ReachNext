// ─────────────────────────────────────────────────────────────────────────────
// Centralized AI Service — Normalized Error Types
// ─────────────────────────────────────────────────────────────────────────────

export class AIProviderError extends Error {
  constructor(
    public provider: string,
    public statusCode: number | null,
    message: string
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export class AIRateLimitError extends AIProviderError {
  constructor(provider: string, message?: string) {
    super(provider, 429, message || `Rate limited by ${provider}`);
    this.name = "AIRateLimitError";
  }
}

export class AITimeoutError extends AIProviderError {
  constructor(provider: string, timeoutMs: number) {
    super(provider, null, `${provider} timed out after ${timeoutMs}ms`);
    this.name = "AITimeoutError";
  }
}

export class AIValidationError extends AIProviderError {
  constructor(provider: string, message: string) {
    super(provider, null, `${provider} validation error: ${message}`);
    this.name = "AIValidationError";
  }
}
