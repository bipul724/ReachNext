// ---------------------------------------------------------------------------
// DEPRECATED — Use `import { getAIService } from "../lib/ai"` instead.
//
// This module is preserved for backward compatibility. All calls are now
// routed through the centralized AI service. It will be removed in a future
// release.
// ---------------------------------------------------------------------------

import { getAIService } from "./ai";

interface GenerateOptions {
  /** Timeout in milliseconds (default: 15000) */
  timeoutMs?: number;
  /** Max retry attempts for transient errors (default: 2, so 3 total tries) */
  maxRetries?: number;
}

/**
 * @deprecated Use `getAIService().callModel(...)` instead.
 *
 * Calls the centralized AI service with backward-compatible signature.
 * Returns the generated text string directly.
 */
export async function safeGenerate(
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  console.warn(
    "⚠️ Deprecated: safeGenerate() is deprecated. Use getAIService().callModel() instead."
  );

  const { timeoutMs = 15000, maxRetries = 2 } = options;

  const response = await getAIService().callModel({
    task: "legacy_safe_generate",
    userPrompt: prompt,
    temperature: 0.1,
    timeoutMs,
    maxRetries,
  });

  return response.text;
}

