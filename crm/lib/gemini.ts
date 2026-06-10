import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error(
    "❌ GEMINI_API_KEY is not set. AI features (Autopilot, Insights) will fail."
  );
}

export const genAI = new GoogleGenerativeAI(apiKey || "");

// Using gemini-2.0-flash for fast, high-quality campaign generation
export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

// --- Retry + Timeout wrapper ---

interface GenerateOptions {
  /** Timeout in milliseconds (default: 15000) */
  timeoutMs?: number;
  /** Max retry attempts for transient errors (default: 2, so 3 total tries) */
  maxRetries?: number;
}

/**
 * Calls geminiModel.generateContent with:
 * - Configurable timeout (default 15s) via AbortController
 * - Exponential backoff retry for transient errors (429, 500, 503)
 *
 * Returns the generated text string directly.
 * Throws on permanent failures or after all retries are exhausted.
 */
export async function safeGenerate(
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  const { timeoutMs = 15000, maxRetries = 2 } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Race the API call against a timeout
      const result = await Promise.race([
        geminiModel.generateContent(prompt),
        createTimeout(timeoutMs),
      ]);

      return result.response.text().trim();
    } catch (error: unknown) {
      lastError = error;

      // Check if retryable
      const statusCode = getErrorStatus(error);
      const isRetryable =
        statusCode === 429 || statusCode === 500 || statusCode === 503;
      const isTimeout =
        error instanceof Error && error.message === "GEMINI_TIMEOUT";

      if ((isRetryable || isTimeout) && attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.warn(
          `⏳ Gemini attempt ${attempt + 1} failed (${isTimeout ? "timeout" : statusCode}). Retrying in ${delayMs}ms...`
        );
        await sleep(delayMs);
        continue;
      }

      // Not retryable or out of retries — throw
      throw error;
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

// --- Helper utilities ---

function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("GEMINI_TIMEOUT")), ms)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatus(error: unknown): number | null {
  if (error && typeof error === "object") {
    // Google AI SDK errors have a .status property
    if ("status" in error && typeof (error as any).status === "number") {
      return (error as any).status;
    }
    // Some errors nest it in .errorDetails or .message
    if ("message" in error && typeof (error as any).message === "string") {
      const msg = (error as any).message;
      if (msg.includes("429")) return 429;
      if (msg.includes("500")) return 500;
      if (msg.includes("503")) return 503;
    }
  }
  return null;
}
