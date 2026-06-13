// ─────────────────────────────────────────────────────────────────────────────
// Centralized AI Service — Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AIRequest {
  /** Task identifier for logging/tracing and task-based routing */
  task: string;
  /** System prompt (used by providers that support system messages) */
  systemPrompt?: string;
  /** User prompt (main content) */
  userPrompt: string;
  /** Sampling temperature (default: 0.1) */
  temperature?: number;
  /** Max output tokens (optional, provider-specific defaults apply) */
  maxTokens?: number;
  /** Timeout in milliseconds (default: 15000) */
  timeoutMs?: number;
  /** Max retries for transient failures (default: 2) */
  maxRetries?: number;
  /** Optional model override — bypasses the provider's default model */
  model?: string;
}

export interface AIResponse {
  /** The generated text */
  text: string;
  /** Token usage stats (if available from provider) */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /** Which provider served this response */
  provider: string;
  /** Which model was used */
  model: string;
}

export interface AIProvider {
  /** Human-readable provider name ("groq", "gemini", etc.) */
  readonly name: string;
  /** Generate a completion from this provider */
  generate(request: AIRequest): Promise<AIResponse>;
}

export interface AIService {
  /** Route a request through the centralized service (with fallback + logging) */
  callModel(request: AIRequest): Promise<AIResponse>;
}
